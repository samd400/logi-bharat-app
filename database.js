const sqlite3 = require('sqlite3').verbose();
const DB_SOURCE = "logibharat.db";

let db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    }
});

const initializeDatabase = () => {
    db.serialize(() => {
        console.log('Creating tables if they do not exist...');
        
        // Users Table (Shippers & Drivers)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT NOT NULL, -- 'shipper' or 'driver'
            vehicle_details TEXT, -- JSON for drivers
            rating REAL
        )`);

        // Loads Table
        db.run(`CREATE TABLE IF NOT EXISTS loads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            weight REAL NOT NULL,
            dimensions TEXT, -- JSON {l, w, h}
            load_type TEXT,
            mode TEXT,
            is_green BOOLEAN,
            needs_insurance BOOLEAN,
            status TEXT NOT NULL, -- 'posted', 'in-transit', 'completed'
            shipper_id INTEGER,
            driver_id INTEGER,
            accepted_bid_id INTEGER
        )`);

        // Bids Table
        db.run(`CREATE TABLE IF NOT EXISTS bids (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            load_id INTEGER,
            driver_id INTEGER,
            price REAL NOT NULL,
            value_score INTEGER
        )`);
        
        // Trips Table
        db.run(`CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            load_id INTEGER,
            driver_id INTEGER,
            status TEXT NOT NULL, -- 'in-transit', 'completed', 'sos'
            current_lat REAL,
            current_lon REAL
        )`);

        // Warehouses Table
        db.run(`CREATE TABLE IF NOT EXISTS warehouses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            lat REAL,
            lon REAL,
            capacity_sqft INTEGER
        )`);
        
        // Trucker Hubs Table
        db.run(`CREATE TABLE IF NOT EXISTS trucker_hubs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            type TEXT, -- 'parking', 'dhaba', 'mechanic'
            lat REAL,
            lon REAL,
            rating REAL
        )`);

        // Seed initial data if tables are empty
        seedData();
    });
};

const seedData = () => {
    const tablesToSeed = [
        { name: 'users', data: [
            ['Raju Singh', 'driver', '{"vehicle": "Tata Ultra T.16"}', 4.8],
            ['Mani Logistics', 'driver', '{"vehicle": "Eicher Pro 2095"}', 4.6],
            ['Deepak Transports', 'driver', '{"vehicle": "Ashok Leyland Ecomet"}', 4.9],
            ['Green Mile EV', 'driver', '{"vehicle": "Tata Ace EV"}', 4.9],
            ['Bangalore Textiles', 'shipper', null, null]
        ]},
        { name: 'warehouses', data: [
            ['VRL Logistics Warehouse', 12.84, 77.66, 50000],
            ['SafeEx Storage', 12.91, 77.68, 25000]
        ]},
        { name: 'trucker_hubs', data: [
            ['Secure Truck Parking', 'parking', 12.98, 77.7, 4.5],
            ['Singh Da Dhaba', 'dhaba', 13.00, 77.9, 4.8],
            ['Honest Mechanics', 'mechanic', 13.05, 78.2, 4.9]
        ]}
    ];

    tablesToSeed.forEach(table => {
        const checkSql = `SELECT count(*) as count FROM ${table.name}`;
        db.get(checkSql, [], (err, row) => {
            if (err) console.error(`Error checking ${table.name}:`, err);
            if (row.count === 0) {
                console.log(`Seeding ${table.name}...`);
                const placeholders = table.data[0].map(() => '?').join(',');
                const insertSql = `INSERT INTO ${table.name} VALUES (NULL, ${placeholders})`;
                const stmt = db.prepare(insertSql);
                table.data.forEach(rowData => stmt.run(rowData));
                stmt.finalize();
            } else {
                console.log(`${table.name} table already has data.`);
            }
        });
    });
};


module.exports = db;
module.exports.initialize = initializeDatabase;
