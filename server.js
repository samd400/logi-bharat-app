require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./database.js');
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.get('/', (req, res) => { res.render('index'); });

// --- Stats API ---
app.get('/api/stats', (req, res) => {
    const stats = {};
    db.get("SELECT count(*) as count FROM loads WHERE status='posted'", [], (err, r) => {
        stats.posted = r ? r.count : 0;
        db.get("SELECT count(*) as count FROM loads WHERE status='in-transit'", [], (err, r) => {
            stats.in_transit = r ? r.count : 0;
            db.get("SELECT count(*) as count FROM loads WHERE status='completed'", [], (err, r) => {
                stats.completed = r ? r.count : 0;
                db.get("SELECT count(*) as count FROM bids", [], (err, r) => {
                    stats.total_bids = r ? r.count : 0;
                    db.all("SELECT * FROM loads ORDER BY id DESC LIMIT 5", [], (err, rows) => {
                        stats.recent_loads = rows || [];
                        res.json(stats);
                    });
                });
            });
        });
    });
});

// --- Loads API ---
app.get('/api/loads', (req, res) => {
    db.all("SELECT * FROM loads WHERE status = 'posted'", [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json({ loads: rows });
    });
});

app.get('/api/loads/all', (req, res) => {
    db.all("SELECT * FROM loads ORDER BY id DESC", [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json({ loads: rows });
    });
});

app.post('/api/loads', (req, res) => {
    const { origin, destination, weight, dimensions, load_type, mode, is_green, needs_insurance } = req.body;
    const sql = `INSERT INTO loads (origin, destination, weight, dimensions, load_type, mode, is_green, needs_insurance, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted')`;
    const params = [origin, destination, weight, JSON.stringify(dimensions), load_type, mode, is_green ? 1 : 0, needs_insurance ? 1 : 0];
    db.run(sql, params, function(err) {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.json({ message: "success", load_id: this.lastID });
    });
});

app.get('/api/loads/:id', (req, res) => {
    const loadSql = "SELECT * FROM loads WHERE id = ?";
    const bidsSql = "SELECT bids.*, users.name, users.vehicle_details, users.rating FROM bids JOIN users ON bids.driver_id = users.id WHERE bids.load_id = ?";
    db.get(loadSql, [req.params.id], (err, load) => {
        if (err || !load) { res.status(404).json({ error: "Load not found" }); return; }
        db.all(bidsSql, [req.params.id], (err, bids) => {
            res.json({ load, bids: bids || [] });
        });
    });
});

// --- Bids API ---
app.post('/api/bids', (req, res) => {
    const { load_id, driver_id, price } = req.body;
    const value_score = Math.floor(Math.random() * 15) + 85;
    db.run(`INSERT INTO bids (load_id, driver_id, price, value_score) VALUES (?, ?, ?, ?)`,
        [load_id, driver_id, price, value_score], function(err) {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.json({ message: "Bid placed", bid_id: this.lastID });
    });
});

// --- Trips API ---
app.put('/api/trips/start', (req, res) => {
    const { load_id, bid_id, driver_id } = req.body;
    db.run(`UPDATE loads SET status = 'in-transit', driver_id = ?, accepted_bid_id = ? WHERE id = ?`,
        [driver_id, bid_id, load_id], function(err) {
        if (err) { res.status(400).json({ error: err.message }); return; }
        db.run(`INSERT INTO trips (load_id, driver_id, status) VALUES (?, ?, 'in-transit')`,
            [load_id, driver_id], function(err) {
            if (err) { res.status(400).json({ error: err.message }); return; }
            res.json({ message: "Trip started!", trip_id: this.lastID });
        });
    });
});

app.get('/api/trips/active', (req, res) => {
    const sql = `SELECT trips.*, loads.origin, loads.destination, loads.weight, loads.load_type,
                 users.name as driver_name, users.vehicle_details
                 FROM trips JOIN loads ON trips.load_id = loads.id
                 JOIN users ON trips.driver_id = users.id
                 WHERE trips.status = 'in-transit' ORDER BY trips.id DESC LIMIT 5`;
    db.all(sql, [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json({ trips: rows || [] });
    });
});

app.put('/api/trips/:id/complete', (req, res) => {
    db.run(`UPDATE trips SET status = 'completed' WHERE id = ?`, [req.params.id], function(err) {
        if (err || this.changes === 0) { res.status(400).json({ error: err ? err.message : "Not found" }); return; }
        db.get("SELECT load_id FROM trips WHERE id = ?", [req.params.id], (err, trip) => {
            if (trip) db.run(`UPDATE loads SET status = 'completed' WHERE id = ?`, [trip.load_id]);
            res.json({ message: `Trip ${req.params.id} completed.` });
        });
    });
});

// --- Hubs API ---
app.get('/api/warehouses', (req, res) => {
    db.all("SELECT * FROM warehouses", [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json({ warehouses: rows });
    });
});

app.get('/api/trucker_hubs', (req, res) => {
    db.all("SELECT * FROM trucker_hubs", [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json({ hubs: rows });
    });
});

// ============================================================
// --- AI ENDPOINTS ---
// ============================================================

// AI Price Estimator
app.post('/api/ai/estimate-price', (req, res) => {
    const { origin, destination, weight, load_type } = req.body;

    const distanceMap = {
        'bangalore-chennai': 350, 'chennai-bangalore': 350,
        'bangalore-mumbai': 1000, 'mumbai-bangalore': 1000,
        'bangalore-delhi': 2100, 'delhi-bangalore': 2100,
        'bangalore-hyderabad': 570, 'hyderabad-bangalore': 570,
        'bangalore-pune': 840, 'pune-bangalore': 840,
        'mumbai-delhi': 1400, 'delhi-mumbai': 1400,
        'mumbai-chennai': 1330, 'chennai-mumbai': 1330,
        'delhi-chennai': 2190, 'chennai-delhi': 2190,
        'delhi-hyderabad': 1570, 'hyderabad-delhi': 1570,
        'mumbai-hyderabad': 710, 'hyderabad-mumbai': 710,
        'kolkata-delhi': 1470, 'delhi-kolkata': 1470,
        'kolkata-mumbai': 2050, 'mumbai-kolkata': 2050,
        'ahmedabad-delhi': 930, 'delhi-ahmedabad': 930,
        'ahmedabad-mumbai': 530, 'mumbai-ahmedabad': 530,
    };

    const rateMap = {
        'General Goods': 1.8, 'Textiles & Apparel': 2.0,
        'Electronics': 2.8, 'Industrial Parts': 2.2,
        'Perishables (Refrigerated)': 3.8, 'Construction Materials': 1.5
    };

    const normalize = (city) => city.toLowerCase().split(',')[0].trim();
    const key = `${normalize(origin)}-${normalize(destination)}`;
    const distance = distanceMap[key] || 800;
    const rate = rateMap[load_type] || 2.0;
    const w = parseFloat(weight) || 1;
    const base = distance * w * rate;

    res.json({
        min_price: Math.round(base * 0.85 / 100) * 100,
        max_price: Math.round(base * 1.15 / 100) * 100,
        suggested_price: Math.round(base / 100) * 100,
        estimated_km: distance,
        carbon_kg: Math.round(distance * w * 0.062),
        ev_carbon_kg: Math.round(distance * w * 0.018),
        reasoning: `~${distance} km · ${w}T ${load_type} · ₹${rate}/km/T`
    });
});

// AI Chat Assistant (Claude API)
app.post('/api/ai/chat', async (req, res) => {
    const { message, history } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
        // Smart fallback without API key
        const msg = message.toLowerCase();
        let reply = 'I\'m Logi-AI, your logistics assistant! Set ANTHROPIC_API_KEY in your .env file to enable full AI chat. I can help with pricing, routes, documents, and more.';
        if (msg.includes('price') || msg.includes('cost') || msg.includes('rate'))
            reply = '💰 Indian freight rates: Road transport averages ₹1.5–3.5/km/tonne. Refrigerated cargo: ₹3–4/km/T. Electronics: ₹2.5–3/km/T. Use the AI Price Estimator in "Post a Load" for route-specific quotes.';
        else if (msg.includes('waybill') || msg.includes('document') || msg.includes('gst'))
            reply = '📄 E-Waybill is mandatory for goods >₹50,000 moving inter-state. Generate it at ewaybillgst.gov.in. Logi-Bharat auto-fills Part-A from your load details. Part-B (vehicle details) is filled by the driver.';
        else if (msg.includes('green') || msg.includes('ev') || msg.includes('carbon'))
            reply = '🌿 EV/CNG trucks reduce carbon by ~70% vs diesel. Tata Ace EV is ideal for last-mile (<100km). For long-haul, CNG trucks cut emissions by 25–30%. Enable "Logi-Green" in your load form to request eco-friendly vehicles.';
        else if (msg.includes('insurance'))
            reply = '🛡️ Logi-Bharat offers per-trip cargo insurance at ₹450 covering up to ₹5 lakh. Recommended for electronics, textiles, and perishables. Enable it in "Trust & Safety" when posting a load.';
        else if (msg.includes('driver') || msg.includes('trucker'))
            reply = '🚛 Driver tips: Use Trucker\'s Hub to find verified parking, dhabas, and mechanics. Maintain 4.5+ rating for priority load matching. Complete trips on time to boost your Value Score.';
        return res.json({ reply });
    }

    try {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic();
        const messages = (history || []).concat([{ role: 'user', content: message }]);
        const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 400,
            system: `You are Logi-AI, a logistics expert assistant for Logi-Bharat — an Indian freight & logistics platform.
Help users with: freight pricing, route planning, cargo advice, e-waybill/documentation (GST rules), driver best practices, warehouse booking, insurance, and green logistics.
Be concise, practical, and use Indian context (₹, Indian cities, GST, FSSAI for food, etc.).
Use emojis sparingly for clarity. Never make up regulations — say "check with your CA/transporter" if unsure.`,
            messages
        });
        res.json({ reply: response.content[0].text });
    } catch (err) {
        res.status(500).json({ error: 'AI service unavailable', reply: 'Sorry, I encountered an error. Please try again.' });
    }
});

// AI Driver Matching Score
app.get('/api/ai/driver-match/:load_id', (req, res) => {
    const loadSql = "SELECT * FROM loads WHERE id = ?";
    const driversSql = "SELECT * FROM users WHERE role = 'driver'";
    db.get(loadSql, [req.params.load_id], (err, load) => {
        if (!load) { res.status(404).json({ error: 'Load not found' }); return; }
        db.all(driversSql, [], (err, drivers) => {
            const scored = drivers.map(d => {
                const v = JSON.parse(d.vehicle_details || '{}');
                let score = Math.round(d.rating * 10);
                if (load.is_green && v.vehicle && (v.vehicle.includes('EV') || v.vehicle.includes('CNG'))) score += 20;
                if (load.load_type === 'Perishables (Refrigerated)' && v.vehicle && v.vehicle.includes('Refrigerated')) score += 15;
                score += Math.floor(Math.random() * 10);
                return { ...d, match_score: Math.min(score, 100), vehicle: v.vehicle || 'Unknown' };
            });
            scored.sort((a, b) => b.match_score - a.match_score);
            res.json({ drivers: scored });
        });
    });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Logi-Bharat v2 running on http://localhost:${PORT}`);
    db.initialize();
});
