import 'dotenv/config';
import mongoose from 'mongoose';
import Vendor from './src/models/Vendor.js';
import BotSession from './src/models/BotSession.js';
import Sessions from './src/models/Sessions.js';
import Location from './src/models/Location.js';
import Resident from './src/models/Resident.js';
import Alert from './src/models/Alert.js';
import Category from './src/models/Category.js';

const BACKEND_URL = 'http://localhost:5000/api';
const BOT_SIM_URL = 'http://localhost:5001/api/simulate';
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;
const ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function sendBot(sender, text, location = null) {
  const res = await fetch(BOT_SIM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender, text, location }),
  });
  const data = await res.json();
  return data.reply;
}

async function signUpFirebaseUser(email, password) {
  if (!FIREBASE_WEB_API_KEY) {
    throw new Error('FIREBASE_WEB_API_KEY is required to run Firebase resident auth integration checks');
  }
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(`Firebase test account creation failed: ${data.error?.message || response.status}`);
  return data;
}

async function runE2E() {
  console.log('===============================================================');
  console.log('🚀 RUNNING VENDICONNECT 20-POINT END-TO-END VERIFICATION SUITE');
  console.log('===============================================================\n');

  await mongoose.connect(process.env.MONGO_URI);

  const timestamp = Date.now().toString().slice(-4);
  const vendorPhone = `98765${Date.now().toString().slice(-5)}`;
  const shopName = `Annai Vegetable Pushcart ${timestamp}`;

  // 1. WhatsApp greeting 'hi'
  console.log('--- Step 1 & 2: Vendor WhatsApp Registration & Language Selection ---');
  const greetingReply = await sendBot(vendorPhone, 'hi');
  assert(greetingReply.includes('1. தமிழ்') && greetingReply.includes('2. English'), 'Bot prompts for language selection upon receiving "hi"');

  // Select English
  const langReply = await sendBot(vendorPhone, '2');
  assert(langReply.includes('shop or business name'), 'Bot prompts for shop name in English');

  // Step 3: Enter shop name, category, vehicle
  console.log('\n--- Step 3, 4 & 5: Shop Name, Numbered Menus & Consent ---');
  const nameReply = await sendBot(vendorPhone, shopName);
  assert(nameReply.includes('business category') && nameReply.includes('1.'), 'Presents dynamic numbered category choices');

  // Select Category 1
  const catReply = await sendBot(vendorPhone, '1');
  assert(catReply.includes('selling method') && catReply.includes('1. Push Cart'), 'Presents numbered vehicle choices');

  // Select Vehicle 1 (Push Cart)
  const vehReply = await sendBot(vendorPhone, '1');
  assert(vehReply.includes('Location-Sharing Consent') && vehReply.includes('1. Yes, I agree'), 'Presents explicit location-sharing consent');

  // Step 6 & 7: Consent Granted & Location Sharing
  console.log('\n--- Step 6 & 7: Consent Granted & Native Location Sharing ---');
  const consentReply = await sendBot(vendorPhone, '1'); // 1 = Agree
  assert(consentReply.includes('share your current location') || consentReply.includes('GPS location pin'), 'Instructs vendor to share GPS location');

  // Share coordinates (T. Nagar, Chennai: 13.0418, 80.2341)
  const locReply = await sendBot(vendorPhone, '', { latitude: 13.0418, longitude: 80.2341 });
  assert(locReply.includes('Registration Complete') && locReply.includes('ONLINE 🟢'), 'Valid GPS Pin completes registration and sets vendor ONLINE');

  // Verify Vendor persisted in MongoDB Atlas
  const savedVendor = await Vendor.findOne({ Name: shopName });
  assert(savedVendor !== null, 'Vendor record created and persisted in MongoDB Atlas');
  assert(savedVendor.Status === 'ACTIVE', 'Vendor status is ACTIVE in MongoDB');
  assert(savedVendor.LocationConsent === true, 'Vendor LocationConsent is true');

  // Verify Location collection has 2dsphere point
  const savedLocation = await Location.findOne({ Vendor_ID: savedVendor._id });
  assert(savedLocation && savedLocation.geo?.coordinates?.length === 2, 'Vendor coordinates stored in 2dsphere Location collection');

  // Step 8: Admin Dashboard visibility
  console.log('\n--- Step 8: Admin Operations & Parity ---');
  const adminLoginRes = await fetch(`${BACKEND_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const adminAuth = await adminLoginRes.json();
  const adminToken = adminAuth.token || adminAuth.data?.token;
  assert(!!adminToken, 'Admin login succeeded with configured admin credentials');

  const adminVendorsRes = await fetch(`${BACKEND_URL}/admin/vendors?limit=50`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminVendors = await adminVendorsRes.json();
  const visibleVendor = adminVendors.data.find((v) => v.Vendor_ID === savedVendor._id.toString() || v.VendorName === shopName);
  assert(visibleVendor !== undefined, 'Same registered vendor appears in Admin Dashboard');

  // Step 9 & 10: Resident Authentication & Saved Location
  console.log('\n--- Step 9 & 10: Resident Authentication & Geofence Discovery ---');
  const residentEmail = `resident-${Date.now()}@example.com`;
  const firebaseUser = await signUpFirebaseUser(residentEmail, 'ResidentTest@123');
  const resLoginRes = await fetch(`${BACKEND_URL}/residents/auth/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${firebaseUser.idToken}`,
    },
    body: JSON.stringify({
      name: `Kavitha Resident ${timestamp}`,
      address: '42, Venkatanarayana Road, T. Nagar, Chennai',
      latitude: 13.0425,
      longitude: 80.2345, // approx 100 meters away
    }),
  });
  const resAuth = await resLoginRes.json();
  const residentToken = firebaseUser.idToken;
  const residentId = resAuth.data.Resident_ID;
  assert(resLoginRes.status === 201 && !!residentId, 'Firebase resident created and profile synced to MongoDB');

  // Resident discovers nearby vendor
  const nearbyRes = await fetch(`${BACKEND_URL}/vendors/nearby?lat=13.0425&lng=80.2345&radius=1000`);
  const nearbyData = await nearbyRes.json();
  assert(nearbyData.success === true, 'Nearby discovery API succeeded');
  const foundVendor = nearbyData.data.find((v) => v.VendorName === shopName);
  assert(foundVendor !== undefined, 'Resident finds active nearby vendor within configured radius');
  assert(foundVendor.distanceKm < 0.3, `Accurate distance calculated: ${(foundVendor.distanceKm * 1000).toFixed(0)}m`);

  // Step 11: Vendor Updates Location -> Proximity Notification
  console.log('\n--- Step 11 & 12: Live Location Update & Proximity Alert ---');
  // Vendor updates their pin via WhatsApp
  const updateReply = await sendBot(vendorPhone, '', { latitude: 13.0420, longitude: 80.2342 });
  assert(updateReply.includes('Location updated') || updateReply.includes('ONLINE 🟢'), 'Vendor location update processed via WhatsApp');

  // Wait a brief moment for asynchronous proximity pass
  await new Promise((r) => setTimeout(r, 600));

  // Step 13: In-App Proximity Notification Check for Resident
  console.log('\n--- Step 13: Database-Backed In-App Notification Center ---');
  const alertsRes = await fetch(`${BACKEND_URL}/residents/alerts`, {
    headers: { Authorization: `Bearer ${residentToken}` },
  });
  const alertsData = await alertsRes.json();
  assert(alertsData.success === true, 'GET /api/residents/alerts succeeded');
  assert(alertsData.data.length >= 1, `Resident received in-app proximity alert (count: ${alertsData.data.length})`);
  const firstAlert = alertsData.data[0];
  assert(firstAlert.vendorName === shopName, 'Proximity alert matches approaching vendor');
  assert(firstAlert.read === false, 'Alert is initially marked as unread');

  // Mark alert as read
  const markReadRes = await fetch(`${BACKEND_URL}/residents/alerts/${firstAlert.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${residentToken}` },
  });
  const markReadData = await markReadRes.json();
  assert(markReadData.success === true && markReadData.data.read === true, 'PATCH /api/residents/alerts/:id/read marks alert read in database');

  // Step 14: Offline Transition & Consent Revocation
  console.log('\n--- Step 14: Vendor Going Offline & Removal from Discovery ---');
  const offlineReply = await sendBot(vendorPhone, 'offline');
  assert(offlineReply.includes('OFFLINE 🔴'), 'Vendor successfully transitioned to OFFLINE via text command');

  const vendorAfterOffline = await Vendor.findById(savedVendor._id);
  assert(vendorAfterOffline.Status === 'INACTIVE', 'Vendor status updated to INACTIVE in MongoDB');

  // Offline vendor MUST NOT appear in discovery
  const nearbyAfterOffline = await fetch(`${BACKEND_URL}/vendors/nearby?lat=13.0425&lng=80.2345&radius=1000`);
  const nearbyAfterData = await nearbyAfterOffline.json();
  const offlineFound = nearbyAfterData.data.some((v) => v.VendorName === shopName);
  assert(!offlineFound, 'Offline vendor is excluded from active resident discovery');

  // Step 15: Cleanliness Check
  console.log('\n--- Step 15: Mock Data & Clean Database Audit ---');
  const remainingVendors = await Vendor.countDocuments();
  assert(remainingVendors >= 1, `Verified actual database persistence (${remainingVendors} verified vendor)`);

  const mockMurugan = await Vendor.findOne({ Name: 'Murugan Fruit Cart' });
  assert(mockMurugan === null, 'Seeded mock vendor "Murugan Fruit Cart" is purged from database');

  const mockSelvi = await Vendor.findOne({ Name: 'Selvi Fresh Vegetables' });
  assert(mockSelvi === null, 'Seeded mock vendor "Selvi Fresh Vegetables" is purged from database');

  console.log('\n===============================================================');
  console.log(`🏁 E2E VERIFICATION COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runE2E().catch((err) => {
  console.error('[E2E Error]', err);
  process.exit(1);
});
