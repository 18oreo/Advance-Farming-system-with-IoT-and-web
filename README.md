# 🌿 AgriTechPro — Advanced MERN Farming IoT Platform

A full-stack, production-grade smart farming dashboard built with the **MERN stack** (MongoDB, Express, React, Node.js), integrated with **ThingSpeak IoT API** for real-time sensor data monitoring.

---

## 📡 ThingSpeak Configuration

| Parameter | Value |
|-----------|-------|
| **Channel ID** | `your_channel_id` |
| **Read API Key** | `your_read_key` |
| **Write API Key** | `your_write_key` |

### Field Mapping

| ThingSpeak Field | Sensor | Unit |
|------------------|--------|------|
| `field1` | Temperature | °C |
| `field2` | Humidity | % |
| `field3` | Soil Moisture | % |
| `field4` | Light Intensity | lux |
| `field5` | Rainfall | mm |
| `field6` | Inlet pump | on/off |
| `field7` | Outlet pump | on/off |

---

## 🏗️ Project Structure

```
agritech/
├── package.json              ← Root scripts (concurrently)
├── .gitignore
│
├── server/                   ← Express + MongoDB Backend
│   ├── index.js              ← App entry, cron sync every 2 min
│   ├── .env                  ← Environment variables
│   ├── package.json
│   ├── models/
│   │   ├── SensorReading.js  ← IoT data schema
│   │   ├── User.js           ← Auth + farm profile
│   │   └── Alert.js          ← Threshold alerts
│   ├── controllers/
│   │   ├── thingspeakController.js  ← ThingSpeak API bridge
│   │   ├── sensorController.js      ← DB sensor queries
│   │   ├── authController.js        ← JWT auth
│   │   └── alertController.js       ← Alert management
│   ├── routes/
│   │   ├── thingspeakRoutes.js
│   │   ├── sensorRoutes.js
│   │   ├── authRoutes.js
│   │   └── alertRoutes.js
│   └── middleware/
│       └── auth.js           ← JWT middleware
│
└── client/                   ← React Frontend
    ├── public/index.html
    ├── .env
    ├── package.json
    └── src/
        ├── App.js            ← Router setup
        ├── App.css           ← Global design system
        ├── index.js
        ├── context/
        │   └── AuthContext.js        ← Auth state
        ├── hooks/
        │   └── useThingSpeak.js      ← Real-time data hook
        ├── utils/
        │   └── api.js               ← Axios API clients
        ├── components/
        │   ├── Layout.js / .css      ← Sidebar navigation
        │   └── SensorCard.js / .css  ← Metric cards
        └── pages/
            ├── Dashboard.js / .css   ← Main overview
            ├── Analytics.js / .css   ← Multi-chart analysis
            ├── Sensors.js / .css     ← Data table + export
            ├── Alerts.js / .css      ← Threshold alerts
            ├── Controls.js / .css    ← Send data / irrigation
            └── Login.js / .css       ← Auth page
```
## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **MongoDB** (local or Atlas)
- **npm** or **yarn**

### Option 1: Manual Setup (Development)

```bash
# 1. Clone / extract project
cd agritech

# 2. Install all dependencies
npm run install-all

# 3. Configure environment
# Copy server/.env.example to server/.env and fill in your private values
# Copy client/.env.example to client/.env and fill in the public read values

# 4. Start MongoDB locally
mongod --dbpath /data/db

# 5. Run both server + client concurrently
npm run dev
```

## ✨ Features

### Dashboard
- Live sensor readings auto-refreshed every **15 seconds** directly from ThingSpeak
- 8-sensor metric cards with status indicators (Good / Warning / Critical)
- Interactive historical trend chart with field selector
- Summary stats bar and latest entry details

### Analytics
- Area, Line, and Bar chart types
- Multi-field overlay comparison (select any combination)
- Correlation scatter plot between two chosen fields
- Configurable time range (last 25 / 50 / 100 / 200 entries)
- Per-field min/avg/max summary cards

### Sensors
- Full paginated data table with all 8 fields
- Sortable columns (click header to sort asc/desc)
- Search/filter across all values
- One-click **CSV export**
- Channel metadata display

### Alerts
- Automatic threshold checking on every data refresh
- Severity levels: Critical / High / Medium / Low
- Dismiss individual or all alerts
- Threshold reference table

### Controls
- **Manual Data Entry**: Send custom values to ThingSpeak via Write API
- **Irrigation Zones**: Toggle 4 zones (A–D) on/off
- **Schedule View**: Automated task schedule display

### Auth
- JWT-based authentication
- Register with farm profile (name, location, crop type)
- Guest access (no login required for viewing)
- Collapsible sidebar with user info

---

## 🔄 Auto-Sync

The server runs a **cron job every 2 minutes** that:
1. Fetches latest 50 entries from ThingSpeak
2. Stores only new entries (by `entry_id`) to MongoDB
3. Checks thresholds and creates alerts if needed
This means even if ThingSpeak rate-limits the frontend, MongoDB always has a growing historical dataset.
---
## 🎨 Design System

Earth-tone design language inspired by nature:
- **Fonts**: Playfair Display (headings) + DM Sans (body) + JetBrains Mono (data)
- **Colors**: Soil , Moss , Leaf , Amber 
- **Components**: Sensor cards with color-coded status bars, smooth animations
- **Responsive**: Collapsible sidebar, mobile-friendly layout
---
## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Recharts |
| Backend | Node.js, Express 4 |
| Database | MongoDB + Mongoose |
| IoT API | ThingSpeak REST API |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Scheduler | node-cron |
| Dev Tools | concurrently, nodemon |
---
## 📝 Notes
- The frontend fetches ThingSpeak **directly** for real-time data (no CORS issues — ThingSpeak supports public channel reads).
- The backend syncs to MongoDB for **historical storage and alerting**.
- ThingSpeak free tier allows **~8,000 messages/day** and **~3M reads/day**.
- Guest users bypass auth and can view all dashboard data without an account.
