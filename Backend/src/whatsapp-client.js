/**
 * whatsapp-client.js
 * -----------------------------------------------------------------------
 * Standalone WhatsApp Web client for development/demo.
 * Uses whatsapp-web.js to provide REAL two-way WhatsApp chat.
 *
 * Usage:
 *   node src/whatsapp-client.js
 *
 * 1. Scan the QR code with WhatsApp on a SECOND phone/account
 *    (this number acts as the "VendiConnect Business" number)
 * 2. Message this number from your real phone to test registration
 * -----------------------------------------------------------------------
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

// ── Connect to MongoDB ────────────────────────────────────────────────────
const { default: connectDB } = await import('./config/db.js');
await connectDB();
console.log('[Bot] MongoDB connected ✅');

// ── Import models ─────────────────────────────────────────────────────────
const { default: Vendor }        = await import('./models/Vendor.js');
const { default: Category }      = await import('./models/Category.js');
const { default: VendorLocation } = await import('./models/VendorLocation.js');

// ── Config ────────────────────────────────────────────────────────────────
const LOCATION_TTL_MINUTES = parseInt(process.env.LOCATION_TTL_MINUTES, 10) || 30;
const VEHICLES = ['Pushcart', 'Cycle', 'Auto-rickshaw', 'Van'];

const hashPhone = (phone) => {
  const secret = process.env.PHONE_HASH_SECRET || 'vendiconnect_default_secret';
  return crypto.createHmac('sha256', secret).update(String(phone).trim()).digest('hex');
};

// ── Session store ─────────────────────────────────────────────────────────
const sessions = new Map();

// ── WhatsApp Client ───────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'vendiconnect' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' 📱  Scan this QR code with WhatsApp');
  console.log('     Use a SECOND WhatsApp account as the bot number');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  const info = client.info;
  console.log('\n✅ WhatsApp Bot Ready!');
  console.log(`   Connected as: ${info?.pushname} (+${info?.wid?.user})`);
  console.log('   Message this number from your phone to test registration!\n');
});

client.on('disconnected', (reason) => {
  console.log('[WhatsApp] Disconnected:', reason);
});

// ── Message handler ───────────────────────────────────────────────────────
client.on('message_create', async (msg) => {
  // Only handle INCOMING messages (not ones the bot itself sends)
  if (msg.fromMe) return;
  // Ignore group messages
  if (msg.from.includes('@g.us')) return;

  try {
    // Use msg.from directly as chatId (works with both @c.us and @lid)
    const chatId = msg.from;

    // Get phone number for DB lookup (hash key)
    const contact = await msg.getContact();
    const phone = contact.number || chatId.replace('@lid','').replace('@c.us','');

    console.log(`[Bot] Message from ${contact.pushname || phone}: type="${msg.type}" body="${msg.body}"`);

    // Handle location (coordinates are in _data.lat/_data.lng in whatsapp-web.js)
    if (msg.type === 'location') {
      const lat = msg._data?.lat ?? msg._data?.latitude;
      const lng = msg._data?.lng ?? msg._data?.longitude;
      console.log(`[Bot] 📍 Location received: ${lat}, ${lng}`);
      if (lat && lng) {
        await handleLocation(chatId, phone, parseFloat(lat), parseFloat(lng));
      } else {
        await reply(chatId, '⚠ Could not read your location. Please try sending it again.');
      }
      return;
    }

    // Ignore image/media messages that aren't location
    if (msg.type !== 'chat' && msg.type !== 'text') return;

    // Handle text
    if (msg.body) {
      await handleText(chatId, phone, msg.body.trim());
    }
  } catch (err) {
    console.error('[Bot] Error:', err.message || err);
  }

});

// ── Translations & Smarter Category Matching ──────────────────────────────
function getCatName(name, lang) {
  if (lang !== 'ta') return name;
  const n = name.toLowerCase();
  if (n.includes('veg')) return 'காய்கறிகள் (Vegetables)';
  if (n.includes('fruit')) return 'பழங்கள் (Fruits)';
  if (n.includes('fish') || n.includes('sea') || n.includes('meat')) return 'மீன் & இறைச்சி (Fish & Meat)';
  if (n.includes('snack') || n.includes('bev') || n.includes('juice')) return 'தின்பண்டங்கள் (Snacks)';
  if (n.includes('dairy') || n.includes('milk')) return 'பால் பொருட்கள் (Dairy)';
  if (n.includes('flower') || n.includes('garland')) return 'பூக்கள் (Flowers)'; // catches "poo"
  if (n.includes('tiffin') || n.includes('break')) return 'டிபன் (Tiffin)';
  return name;
}

const VEHICLES_TA = ['தள்ளுவண்டி (Pushcart)', 'மிதிவண்டி (Cycle)', 'ஆட்டோ (Auto-rickshaw)', 'வேன் (Van)'];

// ── Smart Mismatch Detection ──────────────────────────────────────────────
const KEYWORDS = {
  'veg': 'Vegetables', 'காய்': 'Vegetables', 'தக்காளி': 'Vegetables', 'onion': 'Vegetables',
  'fruit': 'Fruits', 'பழ': 'Fruits', 'mango': 'Fruits', 'apple': 'Fruits', 'banana': 'Fruits',
  'flower': 'Flowers', 'poo': 'Flowers', 'பூ': 'Flowers', 'மாலை': 'Flowers', 'jasmine': 'Flowers',
  'fish': 'Fish & Seafood', 'மீன்': 'Fish & Seafood', 'meat': 'Fish & Seafood', 'chicken': 'Fish & Seafood',
  'tiffin': 'Breakfast & Tiffin', 'டிபன்': 'Breakfast & Tiffin', 'dosa': 'Breakfast & Tiffin', 'idli': 'Breakfast & Tiffin',
  'milk': 'Dairy', 'பால்': 'Dairy', 'curd': 'Dairy',
  'snack': 'Snacks', 'juice': 'Snacks', 'tea ': 'Snacks', 'டீ': 'Snacks'
};

function guessCategory(name) {
  const n = name.toLowerCase();
  for (const [kw, cat] of Object.entries(KEYWORDS)) {
    // Basic word boundary check for short English words to avoid false positives
    if (kw.length <= 3 && RegExp(`\\b${kw}\\b`).test(n)) return cat;
    if (kw.length > 3 && n.includes(kw)) return cat;
  }
  return null;
}

const T = {
  en: {
    welcome: `👋 Welcome to *VendiConnect*!\n\nWhat is your shop name?\n_(e.g. Ram Fresh Vegetables, Santhosh Poo Kadai)_`,
    invalidName: `⚠ Please enter a valid name (at least 2 characters).`,
    pickCategory: (name, list) => `Great, *${name}*! 🎉\n\nPick your *category* (reply with number):\n\n${list}`,
    invalidOption: (max, list) => `⚠ Reply with a number 1–${max}:\n\n${list}`,
    mismatchWarn: (guess, chosen) => `🤔 *Wait!* Your shop name suggests you sell *${guess}*, but you chose *${chosen}*.\n\nIs this correct?\n*1.* Yes, proceed\n*2.* No, change category`,
    pickVehicle: (catName, list) => `✅ Category: *${catName}*\n\nNow pick your *vehicle type* (reply with number):\n\n${list}`,
    askConsent: `⚠️ *Location Consent*\n\nVendiConnect will share your live location with nearby residents _only_ when you send a location pin.\n\nDo you agree to share your location?\n*1.* Yes, I agree\n*2.* No, cancel registration`,
    consentDenied: `❌ Registration cancelled. Location sharing is required to use VendiConnect.`,
    regComplete: (name, cat, veh) => `🎊 *Registration Complete!*\n\nName: *${name}*\nCategory: *${cat}*\nVehicle: *${veh}*\n\nWhenever you're out, send a *location pin* 📍 to go live!`,
    alreadyReg: `⚠ This number is already registered.`,
    error: `⚠ Something went wrong. Please try again.`,
    helloLive: (name) => `Hi *${name}*! 👋\n\nSend a *location pin* 📍 to go live on the map.\n\nType *STOP* to go offline.`,
    offlineMsg: (name) => `👋 You are now *OFFLINE*, ${name}.\n\nSend your location again when you're back out!`,
    notRegLoc: `⚠ You are not registered yet. Send *hi* to start registration!`,
    locUpdated: (name, mins) => `✅ Location updated, *${name}*!\n\nYou're now *ACTIVE* on the map for ${mins} mins. 🗺️\n\nType *STOP* when you go offline.`,
  },
  ta: {
    welcome: `👋 *VendiConnect* இற்கு வரவேற்கிறோம்!\n\nஉங்கள் கடையின் பெயர் என்ன?\n_(உதாரணம்: சந்தோஷ் பூக்கடை)_`,
    invalidName: `⚠ சரியான பெயரை உள்ளிடவும்.`,
    pickCategory: (name, list) => `நன்று, *${name}*! 🎉\n\nஉங்கள் *வியாபார வகையை* தேர்ந்தெடுக்கவும் (எண்ணை அனுப்பவும்):\n\n${list}`,
    invalidOption: (max, list) => `⚠ 1–${max} குள் ஒரு எண்ணை அனுப்பவும்:\n\n${list}`,
    mismatchWarn: (guess, chosen) => `🤔 *கவனிக்க!* உங்கள் கடையின் பெயர்படி நீங்கள் *${guess}* விற்கிறீர்கள். ஆனால் நீங்கள் *${chosen}* வகையை தேர்ந்தெடுத்துள்ளீர்கள்.\n\nஇது சரியானதா?\n*1.* ஆம், சரிதான்\n*2.* இல்லை, வகையை மாற்றுகிறேன்`,
    pickVehicle: (catName, list) => `✅ வகை: *${catName}*\n\nஉங்கள் *வாகன வகையை* தேர்ந்தெடுக்கவும் (எண்ணை அனுப்பவும்):\n\n${list}`,
    askConsent: `⚠️ *இடம் பகிர்தல் சம்மதம் (Location Consent)*\n\nநீங்கள் location pin அனுப்பும்போது மட்டுமே உங்கள் இடம் அருகிலுள்ள வாடிக்கையாளர்களுக்கு காட்டப்படும்.\n\nஉங்கள் இடத்தை பகிர சம்மதிக்கிறீர்களா?\n*1.* ஆம், சம்மதிக்கிறேன் (Yes)\n*2.* இல்லை, வேண்டாம் (No)`,
    consentDenied: `❌ பதிவு ரத்து செய்யப்பட்டது. VendiConnect ஐ பயன்படுத்த இடம் பகிர்தல் கட்டாயமாகும்.`,
    regComplete: (name, cat, veh) => `🎊 *பதிவு முடிந்தது!*\n\nபெயர்: *${name}*\nவகை: *${cat}*\nவாகனம்: *${veh}*\n\nவியாபாரம் தொடங்கும்போது, உங்கள் *location pin* 📍 அனுப்பவும்!`,
    alreadyReg: `⚠ இந்த எண் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது.`,
    error: `⚠ ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.`,
    helloLive: (name) => `வணக்கம் *${name}*! 👋\n\nஉங்கள் கடையை வரைபடத்தில் காட்ட *location pin* 📍 அனுப்பவும்.\n\nகடையை மூட *STOP* என தட்டச்சு செய்யவும்.`,
    offlineMsg: (name) => `👋 நீங்கள் இப்போது *OFFLINE* இல் உள்ளீர்கள், ${name}.\n\nமீண்டும் கடையை திறக்கும்போது location அனுப்பவும்!`,
    notRegLoc: `⚠ நீங்கள் இன்னும் பதிவு செய்யவில்லை. *hi* என அனுப்பி பதிவு செய்யவும்!`,
    locUpdated: (name, mins) => `✅ உங்கள் இடம் புதுப்பிக்கப்பட்டது, *${name}*!\n\nஅடுத்த ${mins} நிமிடங்களுக்கு நீங்கள் வரைபடத்தில் தெரிவீர்கள். 🗺️\n\nகடையை மூட *STOP* என அனுப்பவும்.`,
  }
};

// ── Send helper ────────────────────────────────────────────────────
async function reply(chatId, text) {
  console.log(`[Bot] Sending to ${chatId}: ${text.split('\n')[0]}...`);
  await client.sendMessage(chatId, text);
}

// Helper to move from Category to Vehicle
async function proceedToVehicle(from, session, cat, lang) {
  sessions.set(from, { ...session, state: 'AWAITING_VEHICLE', categoryId: cat._id, categoryName: cat.Name });
  const vList = lang === 'ta' ? VEHICLES_TA : VEHICLES;
  const vehicleListText = vList.map((v, i) => `*${i + 1}.* ${v}`).join('\n');
  await reply(from, T[lang].pickVehicle(getCatName(cat.Name, lang), vehicleListText));
}

// ── Text handler ──────────────────────────────────────────────────────────
async function handleText(from, phone, text) {
  const phoneHash = hashPhone(phone);
  const vendor    = await Vendor.findOne({ PhoneHash: phoneHash });
  const inputMsg  = text.trim().toLowerCase();
  
  // Always get session early to check for override states
  const session = sessions.get(from) || { state: 'IDLE' };

  // ── SUPER RESET ─────────
  if (inputMsg === 'reset' || inputMsg === 'cancel' || inputMsg === 'ரத்து') {
    if (vendor) {
      sessions.set(from, { state: 'AWAITING_RESET_CONFIRM', vendorId: vendor._id, lang: vendor.Language });
      const lang = vendor.Language || 'en';
      const msg = lang === 'ta' 
        ? `⚠️ *எச்சரிக்கை:* உங்கள் கணக்கை முழுமையாக அழிக்க விரும்புகிறீர்களா?\n\n*1.* ஆம், அழிக்கவும்\n*2.* இல்லை, வேண்டாம்`
        : `⚠️ *Warning:* Are you sure you want to completely delete your account?\n\n*1.* Yes, delete my account\n*2.* No, cancel`;
      await reply(from, msg);
    } else {
      sessions.delete(from);
      await reply(from, `🔄 Registration cancelled. Type *hi* to start over.`);
    }
    return;
  }

  if (session.state === 'AWAITING_RESET_CONFIRM') {
    const choice = parseInt(inputMsg, 10);
    const lang = session.lang || 'en';
    if (choice === 1) {
      await Vendor.deleteOne({ _id: session.vendorId });
      sessions.delete(from);
      await reply(from, lang === 'ta' ? `🔄 உங்கள் கணக்கு அழிக்கப்பட்டது. புதிதாக பதிவு செய்ய *hi* என அனுப்பவும்.` : `🔄 Account deleted from database! Type *hi* to register again.`);
    } else if (choice === 2) {
      sessions.delete(from);
      await reply(from, lang === 'ta' ? `✅ கணக்கு அழிப்பது ரத்து செய்யப்பட்டது.` : `✅ Reset cancelled. Your account is safe.`);
    } else {
      await reply(from, `⚠ 1–2:\n*1.* Yes / ஆம்\n*2.* No / இல்லை`);
    }
    return;
  }

  if (vendor) {
    const lang = vendor.Language || 'en';
    const t = T[lang];

    if (inputMsg === 'stop' || inputMsg === 'offline') {
      await Vendor.updateOne({ _id: vendor._id }, { $set: { Status: 'INACTIVE' } });
      await reply(from, t.offlineMsg(vendor.VendorName));
      return;
    }
    
    // Only respond to "hi" or general chat if registered
    if (inputMsg === 'hi' || inputMsg === 'hello' || inputMsg === 'vanakkam') {
      await reply(from, t.helloLive(vendor.VendorName));
    }
    return;
  }

  // ── Registration state machine ──────────────────────────────────────

  if (session.state === 'IDLE') {
    if (inputMsg === 'hi' || inputMsg === 'hello' || inputMsg === 'vanakkam') {
      sessions.set(from, { state: 'AWAITING_LANG' });
      await reply(from,
        `Welcome! Vanakkam! 🙏\n\nChoose language / மொழியை தேர்ந்தெடுக்கவும்:\n\n*1.* தமிழ் (Tamil)\n*2.* English`
      );
    }
    return; // Ignore any other text if not "hi"
  }

  if (session.state === 'AWAITING_LANG') {
    const choice = parseInt(inputMsg, 10);
    if (choice === 1 || choice === 2) {
      const lang = choice === 1 ? 'ta' : 'en';
      sessions.set(from, { state: 'AWAITING_NAME', lang });
      await reply(from, T[lang].welcome);
    } else {
      await reply(from, `⚠ 1. தமிழ்\n2. English\n\nReply with 1 or 2.`);
    }
    return;
  }

  const lang = session.lang || 'en';
  const t = T[lang];

  if (session.state === 'AWAITING_NAME') {
    if (!text || text.length < 2) {
      await reply(from, t.invalidName);
      return;
    }
    const categories = await Category.find({}).lean();
    if (!categories.length) {
      await reply(from, t.error);
      sessions.delete(from);
      return;
    }
    sessions.set(from, { state: 'AWAITING_CATEGORY', lang, name: text.trim(), categories });
    const list = categories.map((c, i) => `*${i + 1}.* ${getCatName(c.Name, lang)}`).join('\n');
    await reply(from, t.pickCategory(text.trim(), list));
    return;
  }

  if (session.state === 'AWAITING_CATEGORY') {
    const choice = parseInt(text, 10);
    const list = session.categories.map((c, i) => `*${i + 1}.* ${getCatName(c.Name, lang)}`).join('\n');
    if (!choice || choice < 1 || choice > session.categories.length) {
      await reply(from, t.invalidOption(session.categories.length, list));
      return;
    }
    
    const cat = session.categories[choice - 1];
    
    // Check for mismatch!
    const guessedCat = guessCategory(session.name);
    // If we guessed a category from their name, and it doesn't match the one they chose:
    if (guessedCat && !cat.Name.toLowerCase().includes(guessedCat.toLowerCase().split(' ')[0])) {
      sessions.set(from, { ...session, state: 'AWAITING_CATEGORY_CONFIRM', pendingCat: cat, guessedCat });
      await reply(from, t.mismatchWarn(getCatName(guessedCat, lang), getCatName(cat.Name, lang)));
      return;
    }
    
    // Otherwise, perfectly normal, move on
    await proceedToVehicle(from, session, cat, lang);
    return;
  }

  if (session.state === 'AWAITING_CATEGORY_CONFIRM') {
    const choice = parseInt(text, 10);
    if (choice === 1) {
      // They insist they are right, proceed
      await proceedToVehicle(from, session, session.pendingCat, lang);
    } else if (choice === 2) {
      // Send them back to category selection
      sessions.set(from, { ...session, state: 'AWAITING_CATEGORY' });
      const list = session.categories.map((c, i) => `*${i + 1}.* ${getCatName(c.Name, lang)}`).join('\n');
      await reply(from, t.pickCategory(session.name, list));
    } else {
      await reply(from, t.invalidOption(2, (lang === 'ta' ? '*1.* ஆம் (Yes)\n*2.* இல்லை (No)' : '*1.* Yes\n*2.* No')));
    }
    return;
  }

  if (session.state === 'AWAITING_VEHICLE') {
    const choice = parseInt(text, 10);
    const vList = lang === 'ta' ? VEHICLES_TA : VEHICLES;
    const vehicleListText = vList.map((v, i) => `*${i + 1}.* ${v}`).join('\n');
    
    if (!choice || choice < 1 || choice > VEHICLES.length) {
      await reply(from, t.invalidOption(VEHICLES.length, vehicleListText));
      return;
    }
    
    const vehicle = VEHICLES[choice - 1]; 
    const displayVehicle = vList[choice - 1];
    
    sessions.set(from, { ...session, state: 'AWAITING_CONSENT', vehicle, displayVehicle });
    await reply(from, t.askConsent);
    return;
  }

  if (session.state === 'AWAITING_CONSENT') {
    const choice = parseInt(text, 10);
    
    if (choice === 2) {
      await reply(from, t.consentDenied);
      sessions.delete(from);
      return;
    } else if (choice !== 1) {
      await reply(from, t.invalidOption(2, (lang === 'ta' ? '*1.* ஆம் (Yes)\n*2.* இல்லை (No)' : '*1.* Yes\n*2.* No')));
      return;
    }

    try {
      const vendor = await Vendor.create({
        VendorName: session.name,
        PhoneHash:  hashPhone(phone),
        Vehicle:    session.vehicle,
        Category_ID: session.categoryId,
        Status: 'INACTIVE',
        Language: lang,
        LocationConsent: true,
      });
      sessions.delete(from);
      console.log(`[Bot] ✅ New vendor registered: ${vendor.VendorName} (${lang})`);
      await reply(from, t.regComplete(vendor.VendorName, getCatName(session.categoryName, lang), session.displayVehicle));
    } catch (err) {
      sessions.delete(from);
      if (err.code === 11000) {
        await reply(from, t.alreadyReg);
      } else {
        console.error('[Bot] DB error:', err);
        await reply(from, t.error);
      }
    }
  }
}

// ── Location handler ──────────────────────────────────────────────────────
async function handleLocation(from, phone, latitude, longitude) {
  const phoneHash = hashPhone(phone);
  const vendor    = await Vendor.findOne({ PhoneHash: phoneHash });

  if (!vendor) {
    await reply(from, T['ta'].notRegLoc + '\n\n' + T['en'].notRegLoc);
    return;
  }

  const lang = vendor.Language || 'en';
  const t = T[lang];

  const geoPoint  = {
    type: 'Point',
    coordinates: [Math.round(longitude * 1000) / 1000, Math.round(latitude * 1000) / 1000],
  };
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + LOCATION_TTL_MINUTES * 60 * 1000);

  await VendorLocation.findOneAndUpdate(
    { Vendor_ID: vendor._id },
    { Vendor_ID: vendor._id, geo: geoPoint, UpdatedAt: now, ExpiresAt: expiresAt },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await Vendor.updateOne({ _id: vendor._id }, { $set: { Status: 'ACTIVE' } });

  console.log(`[Bot] 📍 Location updated for ${vendor.VendorName}`);
  await reply(from, t.locUpdated(vendor.VendorName, LOCATION_TTL_MINUTES));
}

// ── Start ─────────────────────────────────────────────────────────────────
console.log('\n[Bot] Starting WhatsApp client...\n');
client.initialize();
