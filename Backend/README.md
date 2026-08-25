# VendiConnect Backend

Business logic, database, and REST API Gateway for VendiConnect. Owned scope: **Node.js/Express + MongoDB only** — no frontend code, no WhatsApp Cloud API payload parsing (that layer calls into this API once it has already parsed inbound WhatsApp messages).

## Folder structure

```
vendiconnect-backend/
├── .env.example
├── package.json
└── src/
    ├── app.js                        # Express entry point, mounts routes
    ├── config/
    │   └── db.js                     # Mongoose/Atlas connection
    ├── models/
    │   ├── Vendor.js                 # Static vendor profile
    │   ├── VendorLocation.js         # Live location: 2dsphere + TTL indexes
    │   ├── Resident.js
    │   ├── Alert.js                  # Throttle audit log
    │   ├── Rating.js
    │   └── Category.js               # Supporting ref for Vendor.Category_ID
    ├── utils/
    │   ├── geoPrivacy.js             # Coordinate truncation + phone hashing (DPDPA 2023)
    │   └── haversine.js              # Distance + walking ETA
    ├── services/
    │   └── alertService.js           # Notification throttling business logic
    ├── controllers/
    │   ├── locationController.js     # Update vendor location (TTL refresh)
    │   ├── proximityController.js    # $near nearby-vendor search
    │   └── alertController.js        # Throttled alert creation endpoint
    └── routes/
        ├── vendorRoutes.js
        └── alertRoutes.js
```

## Setup

```bash
npm install
cp .env.example .env   # fill in MONGO_URI and PHONE_HASH_SECRET
npm run dev             # nodemon, or `npm start` for plain node
```

## Key endpoints

| Method | Route                              | Purpose                                              |
|--------|-------------------------------------|-------------------------------------------------------|
| POST   | `/api/vendors/:vendorId/location`  | Upsert vendor's live location (called after WhatsApp Live Location parse) |
| GET    | `/api/vendors/nearby?lat=&lng=&radius=` | Geospatial search for the resident app's map          |
| POST   | `/api/alerts`                       | Throttle-checked alert creation (called before an FCM push) |
| GET    | `/health`                           | Uptime check (useful for pinging a Render/Railway free-tier instance to reduce cold starts) |

## Design notes worth knowing

- **No cron jobs for expiry.** `VendorLocation.ExpiresAt` has a TTL index (`expireAfterSeconds: 0`). MongoDB's own background TTL monitor reaps expired docs roughly once every 60s — every location ping simply rewrites `ExpiresAt` to `now + 30min`, which is what "refreshes" the countdown.
- **Privacy is applied at the write boundary.** `toApproximateGeoPoint()` truncates raw GPS to ~100m *before* it's ever passed to `VendorLocation`, and `hashPhoneNumber()` HMAC-hashes phone numbers before they touch `Vendor.PhoneHash` / `Resident.ResidentPhoneHash`. Neither model file accepts raw coordinates or raw phone strings by design — that conversion is the controller's job.
- **`AvgRating` is a deliberate denormalization** on `Vendor`, trading write complexity (must be recalculated whenever `Rating` changes) for fast reads on the map/list view, avoiding a join/aggregation on every proximity query.
- **Alert throttling uses check-then-insert**, not a DB-level constraint, which is adequate for M0-tier traffic. If concurrent double-submits become a real problem at scale, that's the place to add a transaction or short-lived unique index.
- **GeoJSON coordinate order is `[longitude, latitude]`** — opposite of the usual "lat, lng" convention — this trips people up constantly, so it's called out explicitly in `VendorLocation.js` and `proximityController.js`.
