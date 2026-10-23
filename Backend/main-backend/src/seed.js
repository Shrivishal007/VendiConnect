import 'dotenv/config';
import mongoose from 'mongoose';
import Category from './models/Category.js';
import Vendor from './models/Vendor.js';
import Resident from './models/Resident.js';
import Location from './models/Location.js';
import Sessions from './models/Sessions.js';
import Alert from './models/Alert.js';
import AlertThrottle from './models/AlertThrottle.js';
import Ratings from './models/Ratings.js';
import Preferences from './models/Preferences.js';
import ActivityLog from './models/ActivityLog.js';
import AdminUser from './models/AdminUser.js';
import { getDistanceAndEta } from './utils/haversine.js';
import { approximateCoordinates, toApproximateGeoPoint, hashPhoneNumber } from './utils/privacy.js';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const RESET = args.has('--reset');

const LOCATION_TTL_HOURS = 24 * 30; // 30 days for demo/development data

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261011);
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const NOW = new Date();
const minutesAgo = (m) => new Date(NOW.getTime() - m * 60 * 1000);
const hoursAgo = (h) => minutesAgo(h * 60);
const daysAgo = (d) => minutesAgo(d * 24 * 60);
const newId = () => new mongoose.Types.ObjectId();
const pad = (n, w) => String(n).padStart(w, '0');
const round6 = (x) => Math.round(x * 1e6) / 1e6;

const METERS_PER_DEG_LAT = 111320;

// Uniformly distributed random point within maxMeters of a centre
function offsetPoint(center, maxMeters) {
  const dist = maxMeters * Math.sqrt(rand());
  const angle = rand() * 2 * Math.PI;
  const dLat = (dist * Math.cos(angle)) / METERS_PER_DEG_LAT;
  const dLng = (dist * Math.sin(angle)) / (METERS_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180));
  return { lat: round6(center.lat + dLat), lng: round6(center.lng + dLng) };
}

// ---------- reference data (Chennai) ----------

const AREAS = {
  tnagar: {
    label: 'T. Nagar',
    pin: '600017',
    lat: 13.0418,
    lng: 80.2341,
    streets: ['Usman Road', 'Venkatanarayana Road', 'Thyagaraya Road'],
  },
  adyar: {
    label: 'Adyar',
    pin: '600020',
    lat: 13.0067,
    lng: 80.257,
    streets: ['Lattice Bridge Road', 'Gandhi Nagar 2nd Main Road', 'Sardar Patel Road'],
  },
  velachery: {
    label: 'Velachery',
    pin: '600042',
    lat: 12.9815,
    lng: 80.218,
    streets: ['Velachery Main Road', 'Vijayanagar 3rd Main Road', 'Taramani Link Road'],
  },
  mylapore: {
    label: 'Mylapore',
    pin: '600004',
    lat: 13.0339,
    lng: 80.2619,
    streets: ['Luz Church Road', 'Kutchery Road', 'Sathya Dev Avenue'],
  },
  annanagar: {
    label: 'Anna Nagar',
    pin: '600040',
    lat: 13.085,
    lng: 80.2101,
    streets: ['2nd Avenue', '5th Main Road', 'Shanthi Colony 4th Street'],
  },
  besantnagar: {
    label: 'Besant Nagar',
    pin: '600090',
    lat: 13.0002,
    lng: 80.2668,
    streets: ['4th Main Road', "Elliot's Beach Road", '7th Avenue'],
  },
  nungambakkam: {
    label: 'Nungambakkam',
    pin: '600034',
    lat: 13.0569,
    lng: 80.2425,
    streets: ['Khader Nawaz Khan Road', 'Sterling Road', 'Valluvar Kottam High Road'],
  },
  kodambakkam: {
    label: 'Kodambakkam',
    pin: '600024',
    lat: 13.0522,
    lng: 80.2255,
    streets: ['Arcot Road', 'Power House Road', 'Ranganathan Street'],
  },
  porur: {
    label: 'Porur',
    pin: '600116',
    lat: 13.0382,
    lng: 80.1565,
    streets: ['Mount-Poonamallee Road', 'Trunk Road', 'Ramapuram Link Road'],
  },
  tambaram: {
    label: 'Tambaram',
    pin: '600045',
    lat: 12.9249,
    lng: 80.1,
    streets: ['Mudichur Road', 'GST Road', 'Station Road'],
  },
};

const CATEGORIES = [
  ['Fruits', 'fruits'],
  ['Vegetables', 'vegetables'],
  ['Flowers & Garlands', 'flowers'],
  ['Tea & Snacks', 'tea'],
  ['Tiffin (Idli & Dosa)', 'tiffin'],
  ['Sundal & Corn', 'sundal'],
  ['Ice Cream', 'ice-cream'],
  ['Fish & Seafood', 'fish'],
  ['Tender Coconut', 'coconut'],
  ['Fresh Juice', 'juice'],
  ['Household Items', 'household'],
  ['Sweets & Savouries', 'sweets'],
];

// name, vehicle, category, area, vendor status, consent session, minutes since last location ping (ACTIVE only)
// Stale threshold in the app is 5 min, so pings of 6+ min show up as STALE_SIGNAL.
const VENDOR_DEFS = [
  ['Murugan Fruit Cart', 'Push Cart', 'Fruits', 'tnagar', 'ACTIVE', 'ACTIVE', 1],
  ['Selvi Fresh Vegetables', 'Push Cart', 'Vegetables', 'adyar', 'ACTIVE', 'ACTIVE', 2],
  ['Kannan Tea Stall', 'Cycle Cart', 'Tea & Snacks', 'velachery', 'ACTIVE', 'ACTIVE', 0],
  ['Lakshmi Poo Kadai', 'Head-load Basket', 'Flowers & Garlands', 'mylapore', 'ACTIVE', 'ACTIVE', 3],
  ['Raju Idli Vandi', 'Tricycle', 'Tiffin (Idli & Dosa)', 'annanagar', 'ACTIVE', 'ACTIVE', 1],
  ['Babu Sundal Wala', 'Push Cart', 'Sundal & Corn', 'besantnagar', 'ACTIVE', 'ACTIVE', 4],
  ['Kumar Kulfi & Ice Cream', 'Tricycle', 'Ice Cream', 'nungambakkam', 'ACTIVE', 'ACTIVE', 2],
  ['Anandhi Meen Kadai', 'Two-wheeler', 'Fish & Seafood', 'kodambakkam', 'ACTIVE', 'ACTIVE', 12],
  ['Ganesan Elaneer', 'Push Cart', 'Tender Coconut', 'porur', 'ACTIVE', 'ACTIVE', 1],
  ['Rani Juice Corner', 'Push Cart', 'Fresh Juice', 'tambaram', 'ACTIVE', 'ACTIVE', 3],
  ['Sekar Veg Van', 'Mini Van', 'Vegetables', 'velachery', 'ACTIVE', 'ACTIVE', 7],
  ['Parvathi Fruit Basket', 'Head-load Basket', 'Fruits', 'adyar', 'ACTIVE', 'ACTIVE', 2],
  ['Mani Murukku Cycle', 'Cycle Cart', 'Sweets & Savouries', 'tnagar', 'ACTIVE', 'ACTIVE', 16],
  ['Vijay Utensil Vandi', 'Push Cart', 'Household Items', 'annanagar', 'ACTIVE', 'ACTIVE', 2],
  ['Jothi Jasmine Garlands', 'Cycle Cart', 'Flowers & Garlands', 'mylapore', 'ACTIVE', 'ACTIVE', 1],
  // finished for the day (consent given, no live location)
  ['Dhanam Fruit Cart', 'Push Cart', 'Fruits', 'kodambakkam', 'INACTIVE', 'ACTIVE', null],
  ['Saravanan Tea Vandi', 'Tricycle', 'Tea & Snacks', 'porur', 'INACTIVE', 'ACTIVE', null],
  ['Meena Sundal Basket', 'Head-load Basket', 'Sundal & Corn', 'tambaram', 'INACTIVE', 'ACTIVE', null],
  // withdrew consent
  ['Ravi Vegetable Cart', 'Push Cart', 'Vegetables', 'adyar', 'INACTIVE', 'REVOKED', null],
  // newly registered, consent not given yet
  ['Ilango Juice Cart', 'Push Cart', 'Fresh Juice', 'besantnagar', 'INACTIVE', 'PENDING', null],
  ['Kavitha Idli Cart', 'Tricycle', 'Tiffin (Idli & Dosa)', 'mylapore', 'INACTIVE', 'PENDING', null],
  ['Prakash Ice Cream Bike', 'Two-wheeler', 'Ice Cream', 'nungambakkam', 'INACTIVE', 'PENDING', null],
  // suspended by admin
  ['Siva Fish Cart', 'Push Cart', 'Fish & Seafood', 'besantnagar', 'SUSPENDED', 'ACTIVE', null],
  ['Balu Fruit Mini Van', 'Mini Van', 'Fruits', 'tnagar', 'SUSPENDED', 'ACTIVE', null],
];

// two residents per area, in area order
const RESIDENT_DEFS = [
  ['Priya Raman', 'tnagar'],
  ['Arjun Venkatesh', 'tnagar'],
  ['Divya Krishnan', 'adyar'],
  ['Karthik Subramanian', 'adyar'],
  ['Meenakshi Iyer', 'velachery'],
  ['Suresh Babu', 'velachery'],
  ['Nandhini Rajan', 'mylapore'],
  ['Vignesh Kumar', 'mylapore'],
  ['Ananya Narayanan', 'annanagar'],
  ['Harini Balaji', 'annanagar'],
  ['Rohit Mehta', 'besantnagar'],
  ['Fathima Begum', 'besantnagar'],
  ['Joseph Antony', 'nungambakkam'],
  ['Lavanya Murali', 'nungambakkam'],
  ['Ramesh Chandran', 'kodambakkam'],
  ['Swathi Prakash', 'kodambakkam'],
  ['Aravind Selvam', 'porur'],
  ['Deepa Natarajan', 'porur'],
  ['Mohamed Irfan', 'tambaram'],
  ['Kavya Srinivasan', 'tambaram'],
];

const REVIEWS = {
  good: [
    'Fresh and good quality, fair price.',
    'Came exactly when the alert said, very convenient.',
    'Weighs honestly and speaks politely.',
    'Best in the area, will buy again.',
    'Everything was fresh, thank you for coming to our street.',
    'Reasonable price and always on time.',
  ],
  mixed: [
    'Quality is average, price slightly high.',
    'Okay for the price, nothing special.',
    'Good items but he came later than the alert time.',
  ],
  bad: ['Items were not very fresh today.', 'Waited a long time and the vendor never reached our lane.'],
};

function ratingValue() {
  const r = rand();
  if (r < 0.05) return 1;
  if (r < 0.15) return 2;
  if (r < 0.35) return 3;
  if (r < 0.7) return 4;
  return 5;
}

function reviewFor(rating) {
  if (rand() < 0.4) return '';
  if (rating >= 4) return pick(REVIEWS.good);
  if (rating === 3) return pick(REVIEWS.mixed);
  return pick(REVIEWS.bad);
}

// Vendor position at alert time, kept inside the resident's radius using the same approximation + distance code as the app
function alertGeometry(resident) {
  const home = { lat: resident.Latitude, lng: resident.Longitude };
  let last = null;
  for (let i = 0; i < 25; i += 1) {
    const p = offsetPoint(home, resident.NotificationRadius * 0.95);
    const approx = approximateCoordinates(p.lat, p.lng);
    last = getDistanceAndEta({ lat: approx.latitude, lng: approx.longitude }, home);
    if (last.distanceKm * 1000 <= resident.NotificationRadius) return last;
  }
  return last;
}

// ---------- dataset ----------

async function buildDataset() {
  // Categories
  const categories = CATEGORIES.map(([Name, Icon]) => ({ _id: newId(), Name, Icon }));
  const categoryByName = new Map(categories.map((c) => [c.Name, c]));

  // Vendors
  const vendorMeta = []; // keeps the scenario fields that are not part of the Vendor document
  const vendors = VENDOR_DEFS.map(([Name, Vehicle, categoryName, area, Status, session, ping], i) => {
    const createdAt = session === 'PENDING' ? daysAgo(randInt(0, 3)) : daysAgo(randInt(25, 70));
    const doc = {
      _id: newId(),
      Name,
      Phone: `+91900001${pad(i + 1, 4)}`, // clearly fake, sequential numbers
      Vehicle,
      Status,
      AvgRating: 0,
      RatingCount: 0,
      Category_ID: categoryByName.get(categoryName)._id,
      createdAt,
      updatedAt: createdAt,
    };
    vendorMeta.push({ area, session, ping, categoryName });
    return doc;
  });

  // Residents
  const residents = RESIDENT_DEFS.map(([Name, areaKey], i) => {
    const area = AREAS[areaKey];
    const home = offsetPoint(area, 450);
    const createdAt = daysAgo(randInt(5, 45));
    return {
      _id: newId(),
      Name,
      Email: `${Name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      FirebaseUID: `seed_uid_${pad(i + 1, 3)}`,
      Latitude: home.lat,
      Longitude: home.lng,
      NotificationRadius: pick([200, 300, 500, 500, 500, 750, 1000]),
      Address: `${randInt(1, 150)}, ${pick(area.streets)}, ${area.label}, Chennai ${area.pin}`,
      FcmToken: null,
      createdAt,
      updatedAt: createdAt,
    };
  });
  const residentArea = residents.map((_, i) => RESIDENT_DEFS[i][1]);

  // Sessions (one per vendor) + Locations (ACTIVE vendors only) + activity log
  const sessions = [];
  const locations = [];
  const activity = [];
  const log = (vendor, Event, EventTime) => activity.push({ Vendor_ID: vendor._id, Event, Description: '', EventTime });

  vendors.forEach((vendor, i) => {
    const meta = vendorMeta[i];
    const consentAt = new Date(vendor.createdAt.getTime() + randInt(2, 30) * 60 * 60 * 1000);
    const phoneHash = hashPhoneNumber(vendor.Phone);

    if (meta.session === 'ACTIVE') {
      const lastActive = meta.ping !== null ? minutesAgo(meta.ping) : hoursAgo(randInt(3, 20));
      sessions.push({
        Vendor_ID: vendor._id,
        Phone: phoneHash,
        Status: 'ACTIVE',
        Consent: true,
        ConsentTimestamp: consentAt,
        ConsentWithdrawnAt: null,
        LastActive: lastActive,
      });
    } else if (meta.session === 'REVOKED') {
      const withdrawnAt = daysAgo(2);
      sessions.push({
        Vendor_ID: vendor._id,
        Phone: phoneHash,
        Status: 'REVOKED',
        Consent: false,
        ConsentTimestamp: consentAt,
        ConsentWithdrawnAt: withdrawnAt,
        LastActive: withdrawnAt,
      });
      log(vendor, 'Consent Granted', consentAt);
      log(vendor, 'Consent Withdrawn', withdrawnAt);
    } else {
      sessions.push({
        Vendor_ID: vendor._id,
        Phone: phoneHash,
        Status: 'PENDING_CONSENT',
        Consent: false,
        ConsentTimestamp: null,
        ConsentWithdrawnAt: null,
        LastActive: vendor.createdAt,
      });
    }

    if (vendor.Status === 'ACTIVE') {
      const point = offsetPoint(AREAS[meta.area], 350);
      const updatedAt = minutesAgo(meta.ping);
      locations.push({
        Vendor_ID: vendor._id,
        geo: toApproximateGeoPoint(point.lat, point.lng),
        UpdatedAt: updatedAt,
        ExpiresAt: new Date(NOW.getTime() + LOCATION_TTL_HOURS * 60 * 60 * 1000),
      });
      log(vendor, 'Location Updated', updatedAt);
      if (i < 4) log(vendor, 'Location Updated', minutesAgo(meta.ping + randInt(60, 240)));
      if (i < 9) log(vendor, 'Consent Granted', consentAt);
    }
  });

  // Alerts: vendor-resident pairs in the same area where the vendor has given consent and is not suspended
  const candidates = [];
  vendors.forEach((vendor, vi) => {
    if (vendorMeta[vi].session !== 'ACTIVE' || vendor.Status === 'SUSPENDED') return;
    residents.forEach((resident, ri) => {
      if (residentArea[ri] === vendorMeta[vi].area) candidates.push({ vi, ri });
    });
  });

  const pairs = shuffle(candidates).slice(0, 24);
  let freshLeft = 6; // a few very recent alerts, so the "rate this vendor" flow can be demoed right after seeding
  const alerts = [];
  const latestByPair = new Map();

  pairs.forEach(({ vi, ri }) => {
    const vendor = vendors[vi];
    const resident = residents[ri];
    let ts;
    if (vendor.Status === 'ACTIVE' && freshLeft > 0) {
      ts = minutesAgo(randInt(5, 80));
      freshLeft -= 1;
    } else {
      ts = minutesAgo(randInt(180, Math.round(5.5 * 24 * 60)));
    }
    const { distanceKm, etaMinutes } = alertGeometry(resident);
    alerts.push({
      Vendor_ID: vendor._id,
      Resident_ID: resident._id,
      Timestamp: ts,
      EtaMinutes: etaMinutes,
      DistanceAt: distanceKm,
    });
    latestByPair.set(`${vendor._id}:${resident._id}`, { vendor, resident, ts });
  });

  // A few pairs were alerted again on an earlier day
  let repeats = 0;
  for (const { vendor, resident, ts } of latestByPair.values()) {
    if (repeats >= 5) break;
    if (NOW.getTime() - ts.getTime() > 3 * 24 * 60 * 60 * 1000) continue;
    const earlier = new Date(ts.getTime() - randInt(24 * 60, 2 * 24 * 60) * 60 * 1000);
    const { distanceKm, etaMinutes } = alertGeometry(resident);
    alerts.push({
      Vendor_ID: vendor._id,
      Resident_ID: resident._id,
      Timestamp: earlier,
      EtaMinutes: etaMinutes,
      DistanceAt: distanceKm,
    });
    repeats += 1;
  }

  const throttles = [...latestByPair.values()].map(({ vendor, resident, ts }) => ({
    Vendor_ID: vendor._id,
    Resident_ID: resident._id,
    LastAlertAt: ts,
  }));

  // Ratings: only for pairs that were alerted, and not for the very fresh alerts (those stay ratable for the demo)
  const ratings = [];
  for (const { vendor, resident, ts } of latestByPair.values()) {
    const ageMin = (NOW.getTime() - ts.getTime()) / 60000;
    if (ageMin < 150 || rand() < 0.15) continue;
    const Rating = ratingValue();
    const when = new Date(Math.min(NOW.getTime() - 60 * 1000, ts.getTime() + randInt(10, 90) * 60 * 1000));
    ratings.push({
      Resident_ID: resident._id,
      Vendor_ID: vendor._id,
      Rating,
      Review: reviewFor(Rating),
      RatingDate: when,
    });
  }

  // Vendor aggregates computed the same way as ratingService (mean rounded to 1 decimal)
  const byVendor = new Map();
  ratings.forEach((r) => {
    const key = String(r.Vendor_ID);
    byVendor.set(key, [...(byVendor.get(key) || []), r.Rating]);
  });
  vendors.forEach((vendor) => {
    const list = byVendor.get(String(vendor._id));
    if (!list) return;
    vendor.RatingCount = list.length;
    vendor.AvgRating = Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10;
  });

  // Preferences: 2 categories for the first 10 residents, 1 for the rest (30 total); first pick = a category sold in their area
  const preferences = [];
  residents.forEach((resident, ri) => {
    const local = vendors
      .map((v, vi) => (vendorMeta[vi].area === residentArea[ri] ? v.Category_ID : null))
      .filter(Boolean);
    const first = pick(local);
    const chosen = [first];
    if (ri < 10) {
      let second = pick(categories)._id;
      while (String(second) === String(first)) second = pick(categories)._id;
      chosen.push(second);
    }
    chosen.forEach((Category_ID) => {
      const createdAt = new Date(resident.createdAt.getTime() + randInt(1, 48) * 60 * 60 * 1000);
      preferences.push({ Resident_ID: resident._id, Category_ID, createdAt, updatedAt: createdAt });
    });
  });

  activity.sort((a, b) => a.EventTime - b.EventTime);

  const ratable = [...latestByPair.values()]
    .filter(
      ({ vendor, resident, ts }) =>
        !ratings.some(
          (r) => String(r.Vendor_ID) === String(vendor._id) && String(r.Resident_ID) === String(resident._id)
        ) && NOW - ts < 2 * 60 * 60 * 1000
    )
    .map(({ vendor, resident }) => `${resident.Email} -> ${vendor.Name}`);

  return {
    ordered: [
      ['Category', Category, categories],
      ['Vendor', Vendor, vendors],
      ['Resident', Resident, residents],
      ['Sessions', Sessions, sessions],
      ['Location', Location, locations],
      ['Alert', Alert, alerts],
      ['AlertThrottle', AlertThrottle, throttles],
      ['Ratings', Ratings, ratings],
      ['Preferences', Preferences, preferences],
      ['ActivityLog', ActivityLog, activity],
    ],
    ratable,
  };
}

// ---------- checks ----------

async function validateAll(ordered) {
  for (const [name, Model, docs] of ordered) {
    for (let i = 0; i < docs.length; i += 1) {
      try {
        await new Model(docs[i]).validate();
      } catch (err) {
        throw new Error(`${name}[${i}] failed schema validation: ${err.message}`);
      }
    }
  }
}

function assertUnique(ordered) {
  const rules = {
    Category: [{ name: 'Name_1', fields: ['Name'] }],
    Vendor: [{ name: 'Phone_1', fields: ['Phone'] }],
    Resident: [
      { name: 'Email_1', fields: ['Email'], sparse: true },
      { name: 'FirebaseUID_1', fields: ['FirebaseUID'] },
    ],
    Sessions: [{ name: 'Vendor_ID_1', fields: ['Vendor_ID'] }],
    Location: [{ name: 'Vendor_ID_1', fields: ['Vendor_ID'] }],
    AlertThrottle: [{ name: 'Vendor_ID_1_Resident_ID_1', fields: ['Vendor_ID', 'Resident_ID'] }],
    Ratings: [{ name: 'Resident_ID_1_Vendor_ID_1', fields: ['Resident_ID', 'Vendor_ID'] }],
    Preferences: [{ name: 'Resident_ID_1_Category_ID_1', fields: ['Resident_ID', 'Category_ID'] }],
  };
  for (const [modelName, , docs] of ordered) {
    for (const { name: indexName, fields, sparse } of rules[modelName] || []) {
      const seen = new Set();
      docs.forEach((doc) => {
        const values = fields.map((field) => doc[field]);
        if (sparse && values.every((value) => value === null || value === undefined)) return;
        const key = JSON.stringify(values.map((value) => String(value ?? null)));
        if (seen.has(key)) {
          throw new Error(`${modelName}: duplicate on unique index ${indexName} (${key})`);
        }
        seen.add(key);
      });
    }
  }
}

async function ensureSuperAdmin() {
  const existingSuperAdmin = await AdminUser.findOne({
    Role: 'SUPER_ADMIN',
  });

  if (existingSuperAdmin) {
    console.log('[seed] Super Admin already exists. Skipping initialization.');
    return;
  }

  const email = process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD must be set when no Super Admin exists.'
    );
  }

  const hashedPassword = await AdminUser.hashPassword(password);

  await AdminUser.create({
    Email: email,
    Password: hashedPassword,
    Role: 'SUPER_ADMIN',
  });

  console.log(`[seed] Default Super Admin created: ${email}`);
}

// ---------- run ----------

async function main() {
  if (DRY_RUN && !process.env.PHONE_HASH_SECRET) process.env.PHONE_HASH_SECRET = 'dry-run-only-secret';

  if (!DRY_RUN) {
    if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed while NODE_ENV=production');
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
    if (!process.env.PHONE_HASH_SECRET)
      throw new Error('PHONE_HASH_SECRET is not set (needed to hash vendor phone numbers)');
  }

  const { ordered, ratable } = await buildDataset();
  await validateAll(ordered);
  assertUnique(ordered);

  console.log(
    `[seed] ${DRY_RUN ? 'Dry run - dataset built and validated, nothing written' : 'Dataset built and validated'}`
  );

  if (!DRY_RUN) {
    await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 5 });
    console.log(`[seed] Connected to database "${mongoose.connection.name}" on ${mongoose.connection.host}`);

    await ensureSuperAdmin();

    const existing = await Promise.all(
      ordered.map(async ([name, Model]) => [name, await Model.estimatedDocumentCount()])
    );
    const nonEmpty = existing.filter(([, count]) => count > 0);

    if (nonEmpty.length > 0 && !RESET) {
      console.error('[seed] Aborting: these collections already contain data:');
      nonEmpty.forEach(([name, count]) => console.error(`         ${name}: ${count}`));
      console.error(
        '[seed] Run "npm run seed:reset" to replace data in all 10 seed-managed collections.'
      );
      process.exitCode = 1;
      return;
    }

    await Promise.all(ordered.map(([, Model]) => Model.init())); // make sure unique / 2dsphere / TTL indexes exist

    if (RESET) {
      await Promise.all(ordered.map(([, Model]) => Model.deleteMany({})));
      console.log('[seed] Existing documents removed (--reset)');
    }

    for (const [name, Model, docs] of ordered) {
      await Model.insertMany(docs);
      console.log(`[seed] Inserted ${String(docs.length).padStart(2)} -> ${name}`);
    }
  }

  const summary = {};
  ordered.forEach(([name, , docs]) => {
    summary[name] = { documents: docs.length, within10to30: docs.length >= 10 && docs.length <= 30 ? 'yes' : 'NO' };
  });
  console.table(summary);

  console.log(
    'Residents use fake Firebase UIDs. To log in as one, create a Firebase email/password user with the same'
  );
  console.log('Sign in to the resident app with an email and password to create a resident account.');
  if (ratable.length > 0) {
    console.log('\nFresh alerts, not yet rated (ratable right now):');
    ratable.slice(0, 4).forEach((line) => console.log(`  ${line}`));
  }
  console.log(
    `\nNote: seeded vendor locations expire after ${LOCATION_TTL_HOURS}h (MongoDB TTL). Run "npm run seed:reset" to refresh all seed data.`
  );
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
