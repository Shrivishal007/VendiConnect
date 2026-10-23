# VendiConnect — Full-Stack Platform

A community-powered street vendor alert and operations platform that bridges the gap between hyper-local push-cart vendors and neighborhood residents while preserving privacy and operational transparency.

---

## 1. System Architecture

The repository contains four primary components:

* `Backend/main-backend/`: Express.js 5.2 (ES Modules) REST API connected to MongoDB and Firebase Admin SDK.
* `Frontend/Admin/`: Operations portal built with React 19, Vite, JavaScript, Tailwind CSS, React Router DOM, Leaflet (OpenStreetMap), and Recharts.
* `Frontend/Resident/`: Mobile application built with React Native, Expo (SDK 58), JavaScript, React Navigation, Zustand, and Leaflet OpenStreetMap in WebView.
* `Backend/whatsapp-bot/`: WhatsApp Web client for street vendors and neighborhood residents, with a local browser-based simulator.

```
vendiconnect/
├── Backend/
│   ├── main-backend/      # Express.js REST API & MongoDB Data Models
│   └── whatsapp-bot/      # WhatsApp Bot & Interactive Web Simulator
└── Frontend/
    ├── Admin/             # Operations & Analytics Web Dashboard
    └── Resident/      # Resident Mobile & Web Discovery App
```

---

## 2. Quick Start Guide

### Prerequisites
- Node.js `v20.x` or `v24.x`
- npm `v10.x` or `v11.x`
- MongoDB Atlas (or another reachable MongoDB deployment) and Firebase project credentials
- For mobile testing: Android phone/emulator with Expo Go for SDK 58, or an iOS simulator on macOS

All commands below are for **Windows PowerShell**. Keep each server running in its own terminal. If PowerShell blocks `npm`/`npx` scripts, use the `.cmd` forms shown below.

### First-time setup

1. Open a terminal at the repository root:
   ```powershell
   cd C:\path\to\VendiConnect_temp-main
   ```
2. Install dependencies once for each app:
   ```powershell
   cd Backend\main-backend; npm.cmd install
   cd ..\whatsapp-bot; npm.cmd install
   cd ..\..\Frontend\Admin; npm.cmd install
   cd ..\Resident; npm.cmd install
   cd ..\..
   ```
3. Create each app's `.env` from its template if it does not already exist. Preserve existing `.env` files; do not overwrite them:
   ```powershell
   if (-not (Test-Path Backend\main-backend\.env)) { Copy-Item Backend\main-backend\.env.example Backend\main-backend\.env }
   if (-not (Test-Path Backend\whatsapp-bot\.env)) { Copy-Item Backend\whatsapp-bot\.env.example Backend\whatsapp-bot\.env }
   if (-not (Test-Path Frontend\Admin\.env)) { Copy-Item Frontend\Admin\.env.example Frontend\Admin\.env }
   if (-not (Test-Path Frontend\Resident\.env)) { Copy-Item Frontend\Resident\.env.example Frontend\Resident\.env }
   ```
4. Configure the environment files:
   - **`Backend/main-backend/.env`**: Replace `MONGO_URI` if needed, set unique `JWT_SECRET` and `PHONE_HASH_SECRET` values, and configure `FIREBASE_SERVICE_ACCOUNT_JSON` with the Firebase service-account JSON for resident auth and push notifications. Change the seed admin credentials before seeding. Other local defaults are in its example. `FIREBASE_WEB_API_KEY` is only needed for Firebase auth integration tests.
   - **`Frontend/Resident/.env`**: Set the Firebase Web app values from the Firebase Console. Enable Email/Password in Firebase Authentication. For a physical phone, set `EXPO_PUBLIC_API_URL` to `http://<computer-LAN-IPv4>:5000/api` instead of localhost.
   - **`Backend/whatsapp-bot/.env`**: Local values for `BACKEND_API_URL`, `PORT`, `NODE_ENV`, and WhatsApp client options are in its example.
   - **`Frontend/Admin/.env`**: `VITE_API_BASE_URL` points to the backend API (local example: `http://localhost:5000/api`).
5. Seeding is optional. For an initial demo dataset and super-admin, run this from `Backend/main-backend/`:
   ```powershell
   npm.cmd run seed
   ```
   **Do not run `npm.cmd run seed:reset` unless you intend to delete and recreate all seed-managed collections.**

> For Android phones, the phone and computer must be on the same network, and Windows Firewall must allow the backend's port (default `5000`). Use the computer's current LAN IPv4 address in the resident app's `EXPO_PUBLIC_API_URL`; `localhost` on the phone means the phone itself.

---

### Start the Backend API (Terminal 1)

Start this first; the dashboards, resident app, and WhatsApp bot use it:
```powershell
cd Backend\main-backend
npm.cmd run dev
```
Health check: `http://localhost:5000/api/health`  
Swagger docs: `http://localhost:5000/api-docs`

For a non-watching process, use `npm.cmd start`.

### Start the Admin Dashboard (Terminal 2)

```powershell
cd Frontend\Admin
npm.cmd run dev
```
Open `http://localhost:5173` and sign in with the administrator credentials configured for the backend. The dashboard sends API requests to the URL configured by `VITE_API_BASE_URL` in `Frontend/Admin/.env`.

### Start the Resident App (Terminal 3)

For web:
```powershell
cd Frontend\Resident
npx.cmd expo start --web
```

For Android phone or emulator:
```powershell
cd Frontend\Resident
npx.cmd expo start --lan
```
Open **Expo Go for SDK 58** on an Android phone and scan the QR code. To launch an installed Android emulator, use `npm.cmd run android` instead. On a physical phone, verify the backend URL in `Frontend/Resident/.env` uses the computer's LAN IPv4 address. For iOS Simulator, run `npm.cmd run ios` on macOS.

After changing the resident app's `.env`, stop and restart Expo with a cleared cache:
```powershell
npx.cmd expo start --lan --clear
```
Account creation requires Firebase Email/Password and device location permission. Web uses coordinates without reverse-geocoding to an address; native mobile platforms can reverse-geocode the location. The resident app sends Firebase ID tokens to the backend; no phone number or OTP is used. Push token registration is unavailable on web.

### Start the WhatsApp Bot and Simulator (Terminal 4)

```powershell
cd Backend\whatsapp-bot
npm.cmd run dev
```
The bot connects to `http://localhost:5000/api` by default. Open the local simulator at `http://localhost:5001/`; its health endpoint is `http://localhost:5001/health`.

For the real WhatsApp Web client, open `http://localhost:5001/qr` or run `npm.cmd run client` in a separate terminal, then scan the QR code via WhatsApp **Linked Devices → Link a Device**. A direct chat starts on an exact `hi` (case-insensitive), processes follow-up messages, and ends on exact `bye`. Groups and inactive chats are ignored. The real client uses a one-time location pin, not continuous tracking. Never test by connecting a personal WhatsApp account unless you intend to enable replies from that account.

### Stop the apps

Press `Ctrl+C` in each terminal running a development server. No database reset is needed to stop the apps.

---

## 3. Key Features & Backend Integrations

### Admin Dashboard (`Admin/`)
* **Live Operations Map**: Interactive Leaflet map utilizing OpenStreetMap tiles. Renders authorized active vendor markers, category filters, and privacy-preserving resident density buffers.
* **Overview & KPI Telemetry**: Metric cards displaying active vendors, residents, dispatched alerts, and active hours alongside Recharts area and bar charts.
* **Vendor Operations**: Search, filter, inspect vendor locations, review session consent status, and mutate vendor operational statuses (`ACTIVE`, `INACTIVE`, `SUSPENDED`).
* **Category Manager**: Full CRUD management of vendor trade classifications with live vendor count tallies.
* **Proximity Alerts Audit**: Audit logs tracking vendor name, resident name, walking ETA in minutes, geofence distance, and dispatch timestamps.
* **Ratings & Feedback**: Community feedback reviews with star scores and text comments.
* **Pilot Analytics**: Recharts visualizations for average ratings per trade category, alert engagement density ratios, and active vendor hours.
* **System Settings & SLAs**: Live monitoring of backend health (`/api/health`), database latency in milliseconds, uptime, memory, and SLA threshold targets.

### Resident Mobile App (`Frontend/Resident/`)
* **Firebase Email Authentication**: Firebase manages resident email/password credentials; the backend verifies Firebase ID tokens and stores resident profile data. No OTP is used.
* **Geofence Perimeter Configuration**: Residents select alert perimeters (`200m`, `300m`, `500m`, `1000m`) and set home locations using device GPS, with an optional editable location label.
* **Vendor Discovery Map**: Live OpenStreetMap showing approaching vendors, walking ETA in minutes, star ratings, and approximate distance.
* **Trade Preferences**: Subscribe to or mute specific vendor categories (e.g. Vegetables, Fresh Juice, Flowers, Tiffin) to prevent alert fatigue.
* **Anti-Fraud Rating Guard**: Submitting a vendor rating requires an actual proximity alert between the vendor and resident within the last 2 hours (`RATING_PROXIMITY_WINDOW_HOURS=2`), preventing fake reviews.
* **Push Notifications**: Expo Notifications & FCM token registration (`PATCH /api/residents/auth/fcm-token`) with an in-app alert simulator for testing without waiting for live hardware GPS tracks.

### WhatsApp Bot (`Backend/whatsapp-bot/`)
* **Real WhatsApp Web Client (Google Chrome)**: Powered by `whatsapp-web.js` and Puppeteer. Launches Google Chrome, displays an auth QR code in the terminal and on `http://localhost:5001/qr`, saves session credentials into `.wwebjs_auth/`, and interfaces with actual WhatsApp chats.
* **Browser Simulator UI**: Built-in WhatsApp Web clone on `http://localhost:5001/` for instant zero-configuration testing without scanning QR codes.
* **Direct WhatsApp Web Client**: Handles inbound messages and sends replies through the linked WhatsApp Web session using `whatsapp-web.js`.
* **Live Catalog & Active Vendors**: Direct REST queries into the Backend (`/api/vendors/nearby`, `/api/vendors/active-vendors`, `/api/public/categories`).
* **Location Pin Geofencing**: Accepts WhatsApp location attachments (`{ latitude, longitude }`), finds vendors within proximity, and calculates arrival ETAs.
* **Street Vendor Telematics**: Enables vendors to broadcast their location (`VENDOR ON`) and terminate their broadcast session (`VENDOR OFF`).
* **Health & Telemetry**: Reports API connectivity, database status, server uptime, and active broadcasting vendor count in real-time (`STATUS`).

---

## 4. Privacy & Security Rules

1. **Resident Geofence Privacy**: A resident's exact home latitude and longitude are **never** exposed to vendors or unauthorized third parties. Proximity calculations execute strictly server-side using MongoDB's `2dsphere` spatial indexing.
2. **Vendor Location Truncation**: Vendor GPS coordinates are stored at approximate resolutions to safeguard vendor safety and prevent unauthorized tracking. WhatsApp location sharing is a one-time pin, visible for up to 30 minutes; it is not continuous live tracking, and the map position changes only when the vendor shares another pin.
3. **Rating Proximity Verification**: `POST /api/ratings` enforces that a vendor must have triggered an alert for that resident within 2 hours. Submissions without qualifying alerts return HTTP 403.

---

## 5. Verification Commands

* **Admin Dashboard Build Check**:
  ```powershell
  cd Frontend\Admin
  npm.cmd run build
  ```
  *(Expected: Bundles clean HTML/CSS/JS in `dist/` with 0 errors)*

* **Resident App Web Export**:
  ```powershell
  cd Frontend\Resident
  npx.cmd expo export --platform web
  ```
  *(Expected: Exports the app to `dist/` without errors)*

* **WhatsApp Bot Health Check**:
  ```bash
  curl http://localhost:5001/health
  ```
  *(Expected: `{"success": true, "service": "VendiConnect WhatsApp Bot", "status": "online"}`)*

* **Backend Health Check**:
  ```bash
  curl http://localhost:5000/api/health
  ```
  *(Expected: `{"success": true, "status": "ok", "database": {"connected": true}}`)*
