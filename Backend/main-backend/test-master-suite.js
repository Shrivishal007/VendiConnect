import 'dotenv/config';
import mongoose from 'mongoose';
import Vendor from './src/models/Vendor.js';
import BotSession from './src/models/BotSession.js';
import Sessions from './src/models/Sessions.js';
import Location from './src/models/Location.js';
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

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 RUNNING VENDICONNECT COMPREHENSIVE 14-POINT VERIFICATION SUITE');
  console.log('===============================================================\n');

  // Connect to DB directly for state assertions
  await mongoose.connect(process.env.MONGO_URI);

  const uniqueSuffix = Date.now().toString().slice(-4);
  const testPhoneEn = `99990${Date.now().toString().slice(-5)}`;
  const testPhoneTa = `98880${Date.now().toString().slice(-5)}`;
  const testPhoneDecline = `97770${Date.now().toString().slice(-5)}`;
  const testPhoneCancel = `96660${Date.now().toString().slice(-5)}`;

  const shopNameEn = `Kannan Fruits ${uniqueSuffix}`;
  const shopNameTa = `அன்னை காய்கறி அங்காடி ${uniqueSuffix}`;
  const shopNameDecline = `Organic Greens ${uniqueSuffix}`;

  // --- REQ 1: 'hi' activation & rejection of unrelated messages ---
  console.log('--- REQ 1: "hi" activation and rejection of unrelated messages ---');
  const resHello = await sendBot(testPhoneEn, 'hello');
  assert(resHello.includes('Please send *hi* to get started') || resHello.includes('*hi* என்று அனுப்பவும்'), 'Rejects greeting "hello" and prompts for standalone "hi"');

  const resRandom = await sendBot(testPhoneEn, 'where are you located?');
  assert(resRandom.includes('Please send *hi* to get started') || resRandom.includes('*hi* என்று அனுப்பவும்'), 'Rejects arbitrary query when in IDLE state');

  const resHiThere = await sendBot(testPhoneEn, 'hi there');
  assert(resHiThere.includes('Please send *hi* to get started') || resHiThere.includes('*hi* என்று அனுப்பவும்'), 'Rejects "hi there" and prompts for standalone "hi"');

  const resUnregLocation = await sendBot(`95550${Date.now().toString().slice(-5)}`, '', { latitude: 13.0418, longitude: 80.2341 });
  assert(resUnregLocation.includes('Please send *hi* to get started') || resUnregLocation.includes('*hi* என்று அனுப்பவும்'), 'Rejects raw location pin from unregistered user');

  const resHi = await sendBot(testPhoneEn, '  HI  '); // Trimmed case-insensitive
  assert(resHi.includes('Choose your language') && resHi.includes('1. தமிழ்') && resHi.includes('2. English'), 'Accepts case-insensitive trimmed "HI" and presents language menu');

  // --- REQ 2: Bilingual Tamil & English Selection & Persistence ---
  console.log('\n--- REQ 2: Bilingual Tamil/English selection & persistence ---');
  const resLangEn = await sendBot(testPhoneEn, '2'); // 2 for English
  assert(resLangEn.includes('enter your *shop or business name*'), 'Option 2 sets English and prompts for shop name in English');

  const dbSessionEn = await BotSession.findOne({ phone: testPhoneEn });
  assert(dbSessionEn && dbSessionEn.language === 'en', 'Language choice "en" is persistently saved in MongoDB BotSession');

  // --- REQ 3: Numbered menu validation ---
  console.log('\n--- REQ 3: Numbered menu validation & state protection ---');
  // At shop name step, test length validation
  const resInvalidShortShop = await sendBot(testPhoneEn, 'A');
  assert(resInvalidShortShop.includes('must be between 2 and 100 characters'), 'Rejects shop name with < 2 characters without advancing state');

  const resShopEn = await sendBot(testPhoneEn, shopNameEn);
  assert(resShopEn.includes('Choose your business category') && resShopEn.includes('1.'), 'Valid shop name accepted and advances to dynamic numbered categories');

  // Test invalid category selection
  const resInvalidCatStr = await sendBot(testPhoneEn, 'fruits');
  assert(resInvalidCatStr.includes('Invalid category choice'), 'Rejects non-numeric string choice in category menu');

  const resInvalidCatNum = await sendBot(testPhoneEn, '999');
  assert(resInvalidCatNum.includes('Invalid category choice'), 'Rejects out-of-range category number 999');

  // Valid category selection
  const resValidCat = await sendBot(testPhoneEn, '2');
  assert(resValidCat.includes('Choose your selling method') && resValidCat.includes('1. Push Cart'), 'Valid numeric category advances to numbered vehicle selection');

  // Test invalid vehicle selection
  const resInvalidVeh = await sendBot(testPhoneEn, 'car');
  assert(resInvalidVeh.includes('Invalid choice. Please reply with a number between 1 and 5'), 'Rejects non-numeric vehicle choice');

  const resValidVeh = await sendBot(testPhoneEn, '1'); // Push Cart
  assert(resValidVeh.includes('Location-Sharing Consent') && resValidVeh.includes('1. Yes, I agree'), 'Valid numeric vehicle advances to explicit location consent');

  // --- REQ 4: Cancellation and Session Recovery ---
  console.log('\n--- REQ 4: Registration cancellation and interrupted session recovery ---');
  await sendBot(testPhoneCancel, 'hi');
  await sendBot(testPhoneCancel, '2'); // English
  await sendBot(testPhoneCancel, 'Cancel Test Shop');
  const cancelSessionBefore = await BotSession.findOne({ phone: testPhoneCancel });
  assert(cancelSessionBefore.step === 'CATEGORY_SELECT', 'Session state preserved before cancellation');

  const resCancel = await sendBot(testPhoneCancel, 'cancel');
  assert(resCancel.includes('Registration cancelled'), 'Explicit "cancel" command aborts registration');
  const cancelSessionAfter = await BotSession.findOne({ phone: testPhoneCancel });
  assert(cancelSessionAfter.step === 'IDLE' && !cancelSessionAfter.draft?.shopName, 'Cancelled session reset to IDLE with cleared draft');

  // --- REQ 5: Location Consent Granted vs Location Pin Parsing ---
  console.log('\n--- REQ 5: Location consent AGREE & valid coordinate ingestion ---');
  const resAgree = await sendBot(testPhoneEn, '1'); // 1 = Agree
  assert(resAgree.includes('Please share your current location now') || resAgree.includes('Location'), 'Consent agree advances to AWAITING_LOCATION prompt');

  // Invalid coordinates rejected
  const resBadCoord = await sendBot(testPhoneEn, '', { latitude: 999, longitude: 999 });
  assert(resBadCoord.includes('Invalid coordinates'), 'Rejects impossible coordinates (lat=999, lng=999)');

  // Valid coordinates pin completes registration
  const resValidPin = await sendBot(testPhoneEn, '', { latitude: 13.0418, longitude: 80.2341 });
  assert(resValidPin.includes('Registration Complete') && resValidPin.includes('ONLINE 🟢'), 'Valid GPS Pin completes registration and sets vendor ONLINE');

  // --- REQ 6: Database Persistence & Parity ---
  console.log('\n--- REQ 6: Database persistence & model integrity ---');
  const vendorDoc = await Vendor.findOne({ Name: shopNameEn });
  assert(vendorDoc !== null, 'Vendor record created in MongoDB Atlas Vendor collection');
  assert(vendorDoc.Status === 'ACTIVE', 'Vendor status is ACTIVE in MongoDB');
  assert(vendorDoc.LocationConsent === true, 'Vendor LocationConsent is persistently true');
  assert(vendorDoc.Language === 'en', 'Vendor preferred Language is persistently stored as "en"');
  assert(vendorDoc.RegisteredVia === 'WHATSAPP', 'Vendor registered channel recorded as WHATSAPP');

  const locationDoc = await Location.findOne({ Vendor_ID: vendorDoc._id });
  assert(locationDoc && locationDoc.geo?.coordinates?.length === 2, 'Vendor location coordinates stored in 2dsphere Location collection');

  const sessionDoc = await Sessions.findOne({ Vendor_ID: vendorDoc._id });
  assert(sessionDoc && sessionDoc.Consent === true && sessionDoc.Status === 'ACTIVE', 'Vendor consent session stored in Sessions collection');

  // --- REQ 7: Prevention of Duplicate Vendor Registrations ---
  console.log('\n--- REQ 7: Prevention of duplicate vendor registrations ---');
  const countBefore = await Vendor.countDocuments({ Name: shopNameEn });
  const resDupHi = await sendBot(testPhoneEn, 'HI');
  assert(resDupHi.includes('ONLINE 🟢') && resDupHi.includes('Options:'), 'Repeat "HI" from registered vendor returns control menu instead of duplicate registration');
  const countAfter = await Vendor.countDocuments({ Name: shopNameEn });
  assert(countBefore === countAfter, 'No duplicate vendor records created on repeated interactions');

  // --- REQ 8: Online / Offline Transitions & Text Commands ---
  console.log('\n--- REQ 8: Online/Offline transitions (stop/offline command & menu toggle) ---');
  // Test explicit text command 'offline'
  const resStopCmd = await sendBot(testPhoneEn, 'offline');
  assert(resStopCmd.includes('OFFLINE 🔴'), 'Text command "offline" toggles vendor to OFFLINE');

  const vendorAfterStop = await Vendor.findById(vendorDoc._id);
  assert(vendorAfterStop.Status === 'INACTIVE', 'Vendor status changed to INACTIVE in MongoDB');

  // Re-activate via menu
  const resStartCmd = await sendBot(testPhoneEn, 'online');
  assert(resStartCmd.includes('GPS location pin') || resStartCmd.includes('Location'), 'Text command "online" prompts for current GPS location');

  await sendBot(testPhoneEn, '', { latitude: 13.0420, longitude: 80.2345 });
  const vendorReactivated = await Vendor.findById(vendorDoc._id);
  assert(vendorReactivated.Status === 'ACTIVE', 'Vendor re-activated to ACTIVE upon receiving new location pin');

  // --- REQ 9: Complete Tamil Registration Flow ---
  console.log('\n--- REQ 9: Complete Tamil (ta) workflow ---');
  await sendBot(testPhoneTa, 'hi');
  const resLangTa = await sendBot(testPhoneTa, '1'); // 1 = Tamil
  assert(resLangTa.includes('உங்கள் *கடை அல்லது வணிகப் பெயரை* உள்ளிடவும்'), 'Tamil language selected: prompts for shop name in Tamil');

  const resShopTa = await sendBot(testPhoneTa, shopNameTa);
  assert(resShopTa.includes('உங்கள் வணிக வகையைத் தேர்ந்தெடுக்கவும்'), 'Tamil category selection displayed with Tamil category names');

  await sendBot(testPhoneTa, '1'); // Category 1
  const resVehTa = await sendBot(testPhoneTa, '1'); // Push Cart
  assert(resVehTa.includes('இருப்பிடப் பகிர்வு ஒப்புதல்') && resVehTa.includes('ஒப்புக்கொள்கிறேன்'), 'Tamil location consent prompt displayed');

  await sendBot(testPhoneTa, '1'); // Agree
  const resPinTa = await sendBot(testPhoneTa, '', { latitude: 13.0450, longitude: 80.2350 });
  assert(resPinTa.includes('பதிவு வெற்றிகரமாக முடிந்தது') && resPinTa.includes('ஆன்லைனில்'), 'Tamil flow completed successfully with Tamil confirmation');

  const vendorTa = await Vendor.findOne({ Name: shopNameTa });
  assert(vendorTa && vendorTa.Language === 'ta', 'Tamil vendor record stored with Language="ta"');

  // --- REQ 10: Location Consent DECLINED Handling ---
  console.log('\n--- REQ 10: Location consent DECLINED scenario ---');
  await sendBot(testPhoneDecline, 'hi');
  await sendBot(testPhoneDecline, '2'); // English
  await sendBot(testPhoneDecline, shopNameDecline);
  await sendBot(testPhoneDecline, '1'); // Category
  await sendBot(testPhoneDecline, '1'); // Vehicle
  const resDecline = await sendBot(testPhoneDecline, '2'); // 2 = Decline
  assert(resDecline.includes('Location sharing declined') && resDecline.includes('cannot be presented as online'), 'Declining consent confirms registration but states vendor cannot be online');

  const declinedVendor = await Vendor.findOne({ Name: shopNameDecline });
  assert(declinedVendor && declinedVendor.Status === 'INACTIVE', 'Declined vendor is saved with Status="INACTIVE" in MongoDB');
  assert(declinedVendor.LocationConsent === false, 'Declined vendor has LocationConsent=false');

  const declinedLoc = await Location.findOne({ Vendor_ID: declinedVendor._id });
  assert(!declinedLoc, 'No location record exists in Location collection for declined vendor');

  // --- REQ 11: Resident Discovery Integrity (Consented & Online Only) ---
  console.log('\n--- REQ 11: Resident discovery API (consented and online vendors only) ---');
  const nearbyRes = await fetch(`${BACKEND_URL}/vendors/nearby?lat=13.0418&lng=80.2341&radius=5000`);
  const nearbyData = await nearbyRes.json();
  assert(nearbyData.success === true, 'Nearby discovery API returns success: true');
  assert(Array.isArray(nearbyData.data), 'Nearby discovery data is an array');

  // Verified vendor should be present
  const activeFound = nearbyData.data.some((v) => v.VendorName === shopNameEn);
  assert(activeFound, 'Active consented vendor is visible in resident discovery');

  // Declined vendor MUST NOT be present
  const declinedFound = nearbyData.data.some((v) => v.VendorName === shopNameDecline);
  assert(!declinedFound, 'Declined consent vendor is EXCLUDED from resident discovery');

  // --- REQ 12: Firebase Resident Email/Password Authentication ---
  console.log('\n--- REQ 12: Firebase resident email/password authentication ---');
  const residentEmail = `resident-${Date.now()}@example.com`;
  const residentPassword = 'ResidentTest@123';
  const firebaseUser = await signUpFirebaseUser(residentEmail, residentPassword);
  const loginRes = await fetch(`${BACKEND_URL}/residents/auth/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${firebaseUser.idToken}`,
    },
    body: JSON.stringify({
      name: 'Karthik Subramanian',
      address: '42, Venkatanarayana Road, T. Nagar, Chennai',
      latitude: 13.0418,
      longitude: 80.2341,
    }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 201 && loginData.success === true && !!loginData.data, 'Firebase ID token creates resident profile');
  assert(loginData.data.Email === residentEmail, 'Firebase email is stored on the resident profile');

  const repeatLoginRes = await fetch(`${BACKEND_URL}/residents/auth/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${firebaseUser.idToken}` },
  });
  const repeatLoginData = await repeatLoginRes.json();
  assert(
    repeatLoginRes.status === 200 && repeatLoginData.data.Resident_ID === loginData.data.Resident_ID,
    'Repeated Firebase authentication sync reuses the same resident profile'
  );

  const wrongPasswordRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
    {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: residentEmail, password: 'WrongPassword@123', returnSecureToken: true }),
    }
  );
  assert(!wrongPasswordRes.ok, 'Firebase rejects an incorrect resident password');

  const meRes = await fetch(`${BACKEND_URL}/residents/auth/me`, {
    headers: { Authorization: `Bearer ${firebaseUser.idToken}` },
  });
  const meData = await meRes.json();
  assert(meData.success === true && meData.data.Name === 'Karthik Subramanian', 'Firebase-authenticated resident profile fetched successfully');

  // Test unauthenticated access to protected resident endpoint
  const unauthRes = await fetch(`${BACKEND_URL}/residents/auth/me`);
  assert(unauthRes.status === 401, 'Unauthorized request correctly rejected with HTTP 401');
  const invalidTokenRes = await fetch(`${BACKEND_URL}/residents/auth/me`, {
    headers: { Authorization: `Bearer ${firebaseUser.refreshToken}` },
  });
  assert(invalidTokenRes.status === 401, 'Firebase refresh token rejected where an ID token is required');

  // --- REQ 13: Admin Operations Consistency & Metadata Parity ---
  console.log('\n--- REQ 13: Admin operations API vendor parity & metadata ---');
  const adminLoginRes = await fetch(`${BACKEND_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.data?.token || adminLoginData.token;

  const adminVendorsRes = await fetch(`${BACKEND_URL}/admin/vendors?limit=50`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminVendorsData = await adminVendorsRes.json();
  assert(adminVendorsData.success === true, 'Admin vendors API returns success: true');

  const adminActiveVendor = adminVendorsData.data.find((v) => v.VendorName === shopNameEn);
  assert(adminActiveVendor !== undefined, 'Registered vendor visible in admin dashboard vendor list');
  assert(adminActiveVendor.Language === 'en', 'Admin vendor list returns preferred Language="en"');
  assert(adminActiveVendor.ConsentStatus === 'ACTIVE', 'Admin vendor list returns ConsentStatus="ACTIVE"');
  assert(adminActiveVendor.geo && Array.isArray(adminActiveVendor.geo.coordinates), 'Admin vendor list includes real geo coordinates for map plotting');

  const adminTaVendor = adminVendorsData.data.find((v) => v.VendorName === shopNameTa);
  assert(adminTaVendor && adminTaVendor.Language === 'ta', 'Admin vendor list returns Tamil vendor with Language="ta"');

  // Detail inspection
  const detailRes = await fetch(`${BACKEND_URL}/admin/vendors/${vendorDoc._id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const detailData = await detailRes.json();
  assert(detailData.success === true && detailData.data.vendor.Name === shopNameEn, 'Admin vendor detail returns comprehensive record');
  assert(detailData.data.session.Consent === true, 'Admin vendor detail returns active consent audit');

  // --- REQ 14: System Health & Core Regression Endpoints ---
  console.log('\n--- REQ 14: System health & core platform regression checks ---');
  const healthRes = await fetch(`${BACKEND_URL}/health`);
  const healthData = await healthRes.json();
  assert(healthData.success === true && healthData.status === 'ok', 'Backend health check returns status "ok"');
  assert(healthData.database?.connected === true, 'MongoDB Atlas database is connected');

  const botHealthRes = await fetch('http://localhost:5001/health');
  const botHealthData = await botHealthRes.json();
  assert(botHealthData.success === true && botHealthData.status === 'online', 'WhatsApp bot service health returns "online"');

  const catRes = await fetch(`${BACKEND_URL}/public/categories`);
  const catData = await catRes.json();
  assert(catData.success === true && catData.data.length >= 10, 'Public categories API returns real categories from MongoDB Atlas');

  console.log('\n===============================================================');
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
