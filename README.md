# 🚛 Logi-Bharat — AI-Powered Logistics Platform

> A full-stack freight & logistics marketplace for India, connecting shippers and drivers with AI-powered price intelligence, live tracking, and green logistics support.

---

## ✨ Features

### For Shippers
- **Post a Load** — specify origin, destination, weight, cargo type, and special requirements
- **AI Price Intelligence** — get an instant fair-market price range before posting
- **Live Bidding** — receive real-time bids from verified drivers
- **Live Tracking** — track your shipment on an interactive map
- **Warehouse Hub** — find and book on-demand warehouse space
- **Documents** — generate GST-compliant e-Waybills and freight invoices
- **Carbon Footprint** — see CO₂ emissions and savings when choosing EV/CNG vehicles

### For Drivers
- **Find Loads** — browse available loads with AI match scores
- **Place Bids** — bid on loads that suit your vehicle and route
- **Trucker's Hub** — find driver-verified parking, dhabas, and mechanics on a map
- **Logi-Pay Wallet** — track earnings, payouts, and transaction history
- **SOS Button** — one-tap emergency alert with location sharing

### 🤖 AI Features (powered by Claude)
| Feature | Description |
|---|---|
| **AI Price Estimator** | Route-aware pricing using city distance matrix + cargo type rates |
| **Logi-AI Chat** | Claude-powered logistics assistant (pricing, e-waybill, green logistics, insurance) |
| **Carbon Calculator** | Compares diesel vs EV/CNG CO₂ per route |
| **Driver-Load Matching** | AI scores each driver based on vehicle type, rating, and load requirements |

---

## 🖥️ Screenshots

| Shipper Dashboard | Post a Load with AI Estimate |
|---|---|
| Stats, recent shipments, carbon saved | Price range + carbon footprint before posting |

| Logi-AI Chat | Live Tracking |
|---|---|
| Ask anything about freight, GST, routes | Real-time map with truck positions |

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Backend | Node.js + Express |
| Database | SQLite (via `sqlite3`) |
| Frontend | EJS templates + Tailwind CSS |
| Maps | Leaflet.js + OpenStreetMap |
| AI | Anthropic Claude API (`claude-haiku-4-5`) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/samd400/logi-bharat-app.git
cd logi-bharat-app

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Configure AI (optional but recommended)

Edit `.env` and add your Anthropic API key to unlock full AI chat:

```env
ANTHROPIC_API_KEY=your_api_key_here
PORT=3000
```

> Without an API key, Logi-AI still works with a smart keyword-based fallback covering common logistics questions.

Get a free API key at [console.anthropic.com](https://console.anthropic.com)

### Run

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
logi-bharat-app/
├── server.js          # Express server + all API routes + AI endpoints
├── database.js        # SQLite schema, seed data
├── views/
│   └── index.ejs      # Full frontend (single-page app)
├── public/
│   └── styles.css     # Custom styles + animations
├── .env.example       # Environment variable template
└── package.json
```

---

## 🔌 API Reference

### Loads
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/loads` | Get all posted loads |
| POST | `/api/loads` | Post a new load |
| GET | `/api/loads/:id` | Get load with bids |

### Bids & Trips
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/bids` | Place a bid on a load |
| PUT | `/api/trips/start` | Accept a bid, start trip |
| GET | `/api/trips/active` | Get active trips |
| PUT | `/api/trips/:id/complete` | Mark trip as complete |

### Hubs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/warehouses` | Get warehouse listings |
| GET | `/api/trucker_hubs` | Get trucker hub locations |

### AI Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/estimate-price` | AI price range for a route |
| POST | `/api/ai/chat` | Chat with Logi-AI assistant |
| GET | `/api/ai/driver-match/:load_id` | AI driver match scores |

---

## 🌿 Green Logistics

Logi-Bharat supports India's push towards sustainable freight:
- Shippers can request **EV or CNG vehicles** when posting loads
- The AI Price Estimator shows **real-time CO₂ comparison** (diesel vs EV)
- The dashboard tracks **total carbon saved** across all EV/CNG trips

---

## 🗺️ Roadmap

- [ ] Real-time WebSocket bidding
- [ ] GPS integration for live truck tracking
- [ ] NIC E-Waybill portal API integration
- [ ] UPI payment integration for Logi-Pay
- [ ] Multi-language support (Hindi, Tamil, Telugu)
- [ ] Mobile app (React Native)
- [ ] Freight insurance API integration

---

## 📄 License

MIT License — free to use and modify.

---

<div align="center">
  Made with ❤️ for Indian logistics
</div>
