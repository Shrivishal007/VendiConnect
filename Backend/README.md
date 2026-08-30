# VendorConnect

A WhatsApp-based platform that connects local **residents** with **mobile street vendors** — vendors share their live location via WhatsApp (no app, no literacy required), and nearby residents get privacy-safe proximity alerts with ETA. Residents buy directly and rate vendors afterward.

## Problem

Street vendors are a large part of the informal economy but are invisible to digital platforms — most have no smartphone literacy and can't use typical seller apps. VendorConnect requires **zero new app installs and zero reading/writing** from vendors, using WhatsApp (already near-universal) as the entire vendor interface.

## Core Features

- **Vendor side (WhatsApp only):** register via first message, pick category from a tap-to-select list, share live location natively — no typing.
- **Resident side (mobile app):** phone OTP login, set home + notification radius, see nearby active vendors on a map (approximate, not exact), get push alerts with ETA, rate vendors post-purchase.
- **Privacy by design:** residents never see exact vendor coordinates or phone numbers; vendors never see resident addresses. Locations auto-expire via TTL when a vendor goes inactive.
- **Vendor analytics:** passive tracking (alerts sent, ratings, active areas) delivered back as a simple weekly WhatsApp summary — no dashboard vendors have to open.
- **Admin web dashboard:** manage vendors/residents, live map monitoring, usage analytics, crash/error logs.

## Tech Stack

| Layer | Technology |
|---|---|
| Vendor interface | WhatsApp Business Cloud API (Meta) — Live Location, interactive lists |
| Backend | Node.js + Express |
| Database | MongoDB Atlas (free M0) + Mongoose — 2dsphere geo indexes, TTL auto-expiry |
| Resident app | React Native (Expo) |
| Admin dashboard | React.js + Recharts |
| Auth | Firebase Phone Auth (residents), JWT + bcrypt (admin) |
| Push notifications | Firebase Cloud Messaging |
| Maps | Leaflet / react-native-maps + OpenStreetMap tiles |
| Hosting | Render / Railway (free tier) |
| Monitoring | Sentry / Firebase Crashlytics |

Fully buildable on free tiers at prototype scale. Main lead-time risk: Meta Business verification for the WhatsApp Cloud API — start early.

## Architecture (high level)

```
Vendor (WhatsApp) --live location/category--> Webhook (Express)
                                                    |
                                                    v
                                          MongoDB (geo + TTL)
                                                    |
                              +---------------------+---------------------+
                              |                                           |
                    Proximity match + haversine ETA                 Admin Dashboard
                              |                                     (React web)
                              v
                    FCM push --> Resident App (React Native)
                              |
                              v
                    Rating --> stored --> feeds vendor's weekly summary
```

## Data Model (summary)

- **Vendor** — whatsappNumber, name, category, avgRating, isActive
- **LocationPing** — vendorId, geo (GeoJSON Point, 2dsphere), expiresAt (TTL)
- **Resident** — phone (Firebase UID), homeLocation, notificationRadius
- **Rating** — vendorId, residentId (hashed), stars, timestamp
- **AlertLog** — vendorId, residentId, distanceAtAlert, etaMinutes, timestamp
- **AdminUser** — email, passwordHash, role

## Key Design Decisions

- **No voice-to-coordinates**: replaced with WhatsApp's native Live Location — removes the biggest technical risk (speech recognition on informal spoken directions).
- **Meta Cloud API directly**, not Twilio — free, no markup.
- **TTL indexes**, not cron jobs, for auto-expiring stale vendor locations.
- **Haversine ETA**, not paid Distance Matrix APIs — free and accurate enough.
- **OpenStreetMap**, not Google Maps — avoids billing-account requirement.
- **Passive analytics** for vendors (system-tracked signals + optional weekly WhatsApp poll) instead of manual data entry — vendors can't be expected to fill forms.

## Status

📋 Planning complete — architecture and 5-week execution plan finalized. Implementation started.

**Timeline (5 weeks):**
1. Foundations — repo setup, Meta verification started, DB schema, Firebase project
2. Vendor onboarding + location ingestion (WhatsApp webhook, geo storage, TTL)
3. Resident app core (auth, map, proximity alerts)
4. Ratings + vendor weekly reports + admin dashboard
5. Testing, deployment, documentation, demo

## Societal Impact

Digital inclusion infrastructure for the informal economy — no new hardware, no app install, no literacy required from vendors, with privacy protection built in for both sides rather than added later.