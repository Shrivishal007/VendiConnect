import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import Category from '../src/models/Category.js';
import Vendor from '../src/models/Vendor.js';
import VendorLocation from '../src/models/VendorLocation.js';
import Resident from '../src/models/Resident.js';
import { hashPhoneNumber, toApproximateGeoPoint } from '../src/utils/geoPrivacy.js';

const DEMO_CENTER = { latitude: 13.0418, longitude: 80.2341 };
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const SIMULATE_INTERVAL_MS = parseInt(process.env.SIMULATE_INTERVAL_MS, 10) || 5000;

const CATEGORY_NAMES = ['Vegetables', 'Fruits', 'Snacks', 'Ironing'];

const VENDOR_SEED = [
  { name: 'Murugan Vegetable Cart', category: 'Vegetables', vehicle: 'Pushcart', avgRating: 4.6, ratingCount: 42 },
  { name: 'Lakshmi Fruit Stall', category: 'Fruits', vehicle: 'Bicycle', avgRating: 4.2, ratingCount: 27 },
  { name: 'Kumar Evening Snacks', category: 'Snacks', vehicle: 'Pushcart', avgRating: 3.9, ratingCount: 15 },
  { name: 'Anitha Ironing Service', category: 'Ironing', vehicle: 'Handcart', avgRating: 4.8, ratingCount: 61 },
  { name: 'Selvam Mixed Fruits & Veggies', category: 'Vegetables', vehicle: 'Auto-cart', avgRating: 3.5, ratingCount: 9 },
];

function jitter(base, spreadDegrees = 0.01) {
  return base + (Math.random() - 0.5) * spreadDegrees;
}

function fakePhoneNumber(seedIndex) {
  return `+9198765${String(43000 + seedIndex).padStart(5, '0')}`;
}

async function seedCategories() {
  const categoryDocs = {};
  for (const name of CATEGORY_NAMES) {
    const doc = await Category.findOneAndUpdate(
      { Name: name },
      { Name: name, IconKey: name.toLowerCase() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    categoryDocs[name] = doc;
  }
  console.log(`[seed] Categories ready: ${Object.keys(categoryDocs).join(', ')}`);
  return categoryDocs;
}

async function seedVendors(categoryDocs) {
  const vendors = [];

  for (let i = 0; i < VENDOR_SEED.length; i += 1) {
    const spec = VENDOR_SEED[i];
    const phoneHash = hashPhoneNumber(fakePhoneNumber(i));

    const vendor = await Vendor.findOneAndUpdate(
      { PhoneHash: phoneHash },
      {
        VendorName: spec.name,
        PhoneHash: phoneHash,
        Vehicle: spec.vehicle,
        Status: 'ACTIVE',
        AvgRating: spec.avgRating,
        RatingCount: spec.ratingCount,
        Category_ID: categoryDocs[spec.category]._id,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const seedLat = jitter(DEMO_CENTER.latitude);
    const seedLng = jitter(DEMO_CENTER.longitude);
    const geoPoint = toApproximateGeoPoint(seedLat, seedLng);

    await VendorLocation.findOneAndUpdate(
      { Vendor_ID: vendor._id },
      {
        Vendor_ID: vendor._id,
        geo: geoPoint,
        UpdatedAt: new Date(),
        ExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    vendors.push(vendor);
    console.log(`[seed] Vendor ready: ${vendor.VendorName} (${vendor._id})`);
  }

  return vendors;
}

async function seedResidents(count = 15) {
  const residents = [];

  for (let i = 0; i < count; i += 1) {
    const phoneHash = hashPhoneNumber(fakePhoneNumber(1000 + i));
    const lat = jitter(DEMO_CENTER.latitude, 0.015);
    const lng = jitter(DEMO_CENTER.longitude, 0.015);

    const resident = await Resident.findOneAndUpdate(
      { ResidentPhoneHash: phoneHash },
      {
        ResidentPhoneHash: phoneHash,
        FirebaseUID: `demo-firebase-uid-${i}`,
        DisplayName: `Demo Resident ${i + 1}`,
        Address: `Test Street ${i + 1}, Demo Neighborhood`,
        HomeLatitude: lat,
        HomeLongitude: lng,
        NotificationRadius: 500,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    residents.push(resident);
  }

  console.log(`[seed] ${residents.length} demo residents ready`);
  return residents;
}

async function runSeed() {
  await connectDB();

  const categoryDocs = await seedCategories();
  const vendors = await seedVendors(categoryDocs);
  await seedResidents(15);

  console.log('[seed] Done. Vendor IDs for simulation:');
  vendors.forEach((v) => console.log(`  - ${v.VendorName}: ${v._id}`));

  await mongoose.connection.close();
  process.exit(0);
}

function buildWalkingPath(startLat, startLng, steps = 12) {
  const path = [];
  let lat = startLat;
  let lng = startLng;

  const headingLat = (Math.random() - 0.5) * 0.0006;
  const headingLng = (Math.random() - 0.5) * 0.0006;

  for (let i = 0; i < steps; i += 1) {
    lat += headingLat + (Math.random() - 0.5) * 0.0001;
    lng += headingLng + (Math.random() - 0.5) * 0.0001;
    path.push({ latitude: lat, longitude: lng });
  }

  return path;
}

async function postLocationPing(vendorId, latitude, longitude) {
  const url = `${API_BASE_URL}/api/vendors/${vendorId}/location`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[simulate] Ping rejected for vendor ${vendorId} (${response.status}): ${body}`);
    return;
  }

  console.log(`[simulate] Vendor ${vendorId} -> (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
}

async function runSimulation() {
  await connectDB();

  const vendors = await Vendor.find({ Status: 'ACTIVE' }).select('VendorName').lean();
  if (vendors.length === 0) {
    console.error('[simulate] No vendors found - run `npm run seed` first.');
    await mongoose.connection.close();
    process.exit(1);
  }

  const locations = await VendorLocation.find({
    Vendor_ID: { $in: vendors.map((v) => v._id) },
  }).lean();

  const locationByVendor = new Map(locations.map((l) => [String(l.Vendor_ID), l]));

  const paths = vendors.map((vendor) => {
    const loc = locationByVendor.get(String(vendor._id));
    const startLat = loc ? loc.geo.coordinates[1] : DEMO_CENTER.latitude;
    const startLng = loc ? loc.geo.coordinates[0] : DEMO_CENTER.longitude;
    return {
      vendorId: String(vendor._id),
      vendorName: vendor.VendorName,
      waypoints: buildWalkingPath(startLat, startLng),
      cursor: 0,
    };
  });

  console.log(
    `[simulate] Streaming GPS pings for ${paths.length} vendors every ${SIMULATE_INTERVAL_MS}ms against ${API_BASE_URL}. Ctrl+C to stop.`
  );

  const timer = setInterval(async () => {
    await Promise.all(
      paths.map(async (p) => {
        if (p.cursor >= p.waypoints.length) {
          p.cursor = 0; // loop the path so the demo can run indefinitely
        }
        const point = p.waypoints[p.cursor];
        p.cursor += 1;
        await postLocationPing(p.vendorId, point.latitude, point.longitude);
      })
    );
  }, SIMULATE_INTERVAL_MS);

  process.on('SIGINT', async () => {
    clearInterval(timer);
    console.log('\n[simulate] Stopped.');
    await mongoose.connection.close();
    process.exit(0);
  });
}

const mode = process.argv[2];

if (mode === 'simulate') {
  runSimulation();
} else {
  runSeed();
}
