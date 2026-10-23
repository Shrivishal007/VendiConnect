import BotSession from '../models/BotSession.js';
import Vendor from '../models/Vendor.js';
import Category from '../models/Category.js';
import Location from '../models/Location.js';
import Sessions from '../models/Sessions.js';
import { ingestVendorLocation } from './locationService.js';
import { matchAndNotifyResidents } from './proximityWorker.js';
import { recordConsent, withdrawConsent } from './vendorSessionService.js';
import { normalizePhoneNumber, hashPhoneNumber } from '../utils/privacy.js';

// Supported vehicles with bilingual display labels
export const VEHICLE_OPTIONS = [
  { id: '1', key: 'Push Cart', en: 'Push Cart', ta: 'தள்ளுவண்டி' },
  { id: '2', key: 'Tricycle', en: 'Tricycle', ta: 'மூன்று சக்கர வண்டி' },
  { id: '3', key: 'Two-wheeler', en: 'Two-wheeler', ta: 'இருசக்கர வாகனம்' },
  { id: '4', key: 'Mini Van', en: 'Mini Van', ta: 'மினி வேன்' },
  { id: '5', key: 'On Foot (Walk)', en: 'On Foot (Walk)', ta: 'நடைபயணம்' },
];

// Category name translations (English -> Tamil)
export const CATEGORY_TRANSLATIONS = {
  Vegetables: 'காய்கறிகள்',
  Fruits: 'பழங்கள்',
  'Flowers & Garlands': 'பூக்கள் மற்றும் மாலைகள்',
  'Tea & Snacks': 'தேநீர் மற்றும் சிற்றுண்டி',
  'Tiffin (Idli & Dosa)': 'டிபன் (இட்லி & தோசை)',
  'Sundal & Corn': 'சுண்டல் மற்றும் சோளம்',
  'Ice Cream': 'ஐஸ்கிரீம்',
  'Fish & Seafood': 'மீன் மற்றும் கடல் உணவு',
  'Tender Coconut': 'இளநீர்',
  'Fresh Juice': 'புதிய பழச்சாறு',
  'Household Items': 'வீட்டு உபயோகப் பொருட்கள்',
  'Sweets & Savouries': 'இனிப்புகள் மற்றும் கார வகைகள்',
};

// Find existing vendor by phone (matches raw, normalized, or hashed)
async function findExistingVendor(rawPhone) {
  const norm = normalizePhoneNumber(rawPhone);
  const hash = hashPhoneNumber(rawPhone);
  return Vendor.findOne({
    $or: [{ Phone: hash }, { Phone: norm }, { Phone: rawPhone }],
  });
}

// Format registered vendor menu in their language
function formatRegisteredVendorMenu(vendor, lang = 'en') {
  const isTa = lang === 'ta';
  const isOnline = vendor.Status === 'ACTIVE';
  const statusBadge = isTa
    ? isOnline
      ? 'ஆன்லைன் 🟢'
      : 'ஆஃப்லைன் 🔴'
    : isOnline
    ? 'ONLINE 🟢'
    : 'OFFLINE 🔴';

  const toggleAction = isTa
    ? isOnline
      ? 'ஆஃப்லைனுக்கு செல்லவும் (Stop Sharing)'
      : 'ஆன்லைனுக்கு செல்லவும் (Go Online)'
    : isOnline
    ? 'Go Offline (Stop Sharing)'
    : 'Go Online';

  if (isTa) {
    return (
      `👋 வணக்கம், *${vendor.Name}*!\n` +
      `தற்போதைய நிலை: *${statusBadge}*\n` +
      `வாகனம்: ${vendor.Vehicle}\n\n` +
      `கட்டளைகள்:\n` +
      `1. இருப்பிடத்தை புதுப்பிக்கவும் (ஒரு GPS Pin அனுப்பவும்)\n` +
      `2. ${toggleAction}\n` +
      `3. கணக்கு விவரங்களைப் பார்க்கவும்\n` +
      `4. மொழியை மாற்றவும் (Change to English)\n\n` +
      `எண்ணை மட்டும் அனுப்பவும்.`
    );
  }

  return (
    `👋 Hello, *${vendor.Name}*!\n` +
    `Current Status: *${statusBadge}*\n` +
    `Vehicle: ${vendor.Vehicle}\n\n` +
    `Options:\n` +
    `1. Update Location (Send a GPS Pin)\n` +
    `2. ${toggleAction}\n` +
    `3. View Account Details\n` +
    `4. Change Language (தமிழுக்கு மாறவும்)\n\n` +
    `Reply with a number.`
  );
}

// Build bilingual category menu
async function buildCategoryMenu(lang = 'en') {
  const categories = await Category.find({}).sort({ Name: 1 }).lean();
  const isTa = lang === 'ta';

  let text = isTa
    ? `📦 *உங்கள் வணிக வகையைத் தேர்ந்தெடுக்கவும்:*\n\n`
    : `📦 *Choose your business category:*\n\n`;

  categories.forEach((cat, index) => {
    const num = index + 1;
    const name = isTa ? CATEGORY_TRANSLATIONS[cat.Name] || cat.Name : cat.Name;
    text += `${num}. ${name}\n`;
  });

  text += isTa ? `\nஎண்ணை மட்டும் அனுப்பவும்.` : `\nReply with a number.`;
  return { text, categories };
}

// Build vehicle selection menu
function buildVehicleMenu(lang = 'en') {
  const isTa = lang === 'ta';
  let text = isTa
    ? `🚚 *உங்கள் விற்பனை முறை / வாகனத்தைத் தேர்ந்தெடுக்கவும்:*\n\n`
    : `🚚 *Choose your selling method / vehicle:*\n\n`;

  VEHICLE_OPTIONS.forEach((v) => {
    text += `${v.id}. ${isTa ? v.ta : v.en}\n`;
  });

  text += isTa ? `\nஎண்ணை மட்டும் அனுப்பவும்.` : `\nReply with a number.`;
  return text;
}

// Location consent prompt
function buildConsentPrompt(lang = 'en') {
  if (lang === 'ta') {
    return (
      `📍 *இருப்பிடப் பகிர்வு ஒப்புதல் (Location Consent):*\n\n` +
      `நீங்கள் குடியிருப்பு பகுதிக்கு அருகில் வரும்போது சுற்றியுள்ள மக்களுக்கு வெண்டிகனெக்ட் தானாக தகவல் தெரிவிக்கும். ` +
      `உங்கள் துல்லியமான வீடு அல்லது தனிப்பட்ட இருப்பிடம் யாருடனும் பகிரப்படாது; தோராயமான தூரம் மற்றும் வருகை நேரம் மட்டுமே பயன்படுத்தப்படும்.\n\n` +
      `குடியிருப்பாளர்கள் நீங்கள் கடைசியாக அனுப்பிய இருப்பிடப் பின்னின் அடிப்படையில் தோராயமான இடத்தைக் காண்பார்கள். ` +
      `நீங்கள் நகரும்போது இது தானாகப் புதுப்பிக்கப்படாது; புதிய பின்னை அனுப்பினால் மட்டுமே புதுப்பிக்கப்படும்.\n\n` +
      `வேலை நேரத்தில் உங்கள் இருப்பிடத்தைப் பகிர ஒப்புக்கொள்கிறீர்களா?\n\n` +
      `1. ஆம், ஒப்புக்கொள்கிறேன் (Yes, I agree)\n` +
      `2. இல்லை, மறுக்கிறேன் (No, I decline)\n\n` +
      `எண்ணை மட்டும் அனுப்பவும்.`
    );
  }

  return (
    `📍 *Location-Sharing Consent:*\n\n` +
    `VendiConnect alerts nearby neighborhood residents when you are approaching their street. ` +
    `Your exact personal coordinates are never exposed; only approximate proximity and walking arrival times are used.\n\n` +
    `Residents see an approximate position from your latest location pin. It does not track your movement; the position updates only when you send another pin.\n\n` +
    `Do you agree to share your location while broadcasting as an active vendor?\n\n` +
    `1. Yes, I agree\n` +
    `2. No, I decline\n\n` +
    `Reply with a number.`
  );
}

// Request location pin prompt
function buildRequestLocationPrompt(lang = 'en') {
  if (lang === 'ta') {
    return (
      `📍 *தயவுசெய்து உங்கள் தற்போதைய இருப்பிடத்தை அனுப்பவும்:*\n\n` +
      `1. வாட்ஸ்அப்பில் கீழே உள்ள 📎 (இணைப்பு) ஐகானைத் தட்டவும்.\n` +
      `2. *Location* என்பதைத் தேர்ந்தெடுக்கவும்.\n` +
      `3. *Send Your Current Location* என்பதைத் தட்டவும் (ஒரு முறை அனுப்பும் இருப்பிடப் பின்).\n\n` +
      `நீங்கள் நகரும்போது இருப்பிடம் தானாகப் புதுப்பிக்கப்படாது. புதிய இருப்பிடப் பின்னை அனுப்பி புதுப்பிக்கவும்.\n\n` +
      `_உங்கள் இருப்பிடம் பெறப்பட்டதும் நீங்கள் ஆன்லைனில் இணைக்கப்படுவீர்கள்!_`
    );
  }

  return (
    `📍 *Please share your current location now:*\n\n` +
    `1. Tap the 📎 (attachment) icon in WhatsApp.\n` +
    `2. Select *Location*.\n` +
    `3. Tap *Send Your Current Location* (this sends a one-time location pin).\n\n` +
    `Your position does not update as you move. Send another pin to update it.\n\n` +
    `_Once received, your cart will be visible as online to nearby residents!_`
  );
}

export const botService = {
  async processMessage({ text = '', sender = '', location = null }) {
    const rawSender = String(sender || '').trim();
    const raw = String(text || '').trim();
    const isStandaloneHi = /^hi$/i.test(raw);

    if (!rawSender) {
      return 'Sender identifier is required.';
    }

    // 1. Fetch or initialize persistent session from MongoDB
    let session = await BotSession.findOne({ phone: rawSender });
    let existingVendor = await findExistingVendor(rawSender);

    if (!session) {
      session = new BotSession({
        phone: rawSender,
        step: existingVendor ? 'REGISTERED' : 'IDLE',
        language: existingVendor?.Language || 'en',
        vendorId: existingVendor?._id || null,
      });
      await session.save();
    } else if (existingVendor && !session.vendorId) {
      session.vendorId = existingVendor._id;
      session.language = existingVendor.Language || session.language || 'en';
      await session.save();
    }

    const lang = session.language || 'en';
    const isTa = lang === 'ta';

    // 2. Handle GPS Location Attachment
    if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      const { latitude, longitude } = location;

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return isTa
          ? `❌ தவறான இருப்பிடக் குறியீடு. தயவுசெய்து சரியான GPS Pin அனுப்பவும்.`
          : `❌ Invalid coordinates received. Please share a valid GPS location pin.`;
      }

      // If user is currently in AWAITING_LOCATION registration step
      if (session.step === 'AWAITING_LOCATION') {
        if (!existingVendor) {
          existingVendor = await Vendor.create({
            Name: session.draft.shopName,
            Phone: hashPhoneNumber(rawSender),
            Vehicle: session.draft.vehicle || 'Push Cart',
            Category_ID: session.draft.categoryId,
            Status: 'ACTIVE',
            Language: session.language,
            LocationConsent: true,
            ConsentTimestamp: new Date(),
            RegisteredVia: 'WHATSAPP',
            LastLocationUpdate: new Date(),
          });
        } else {
          existingVendor.Name = session.draft.shopName || existingVendor.Name;
          existingVendor.Vehicle = session.draft.vehicle || existingVendor.Vehicle;
          existingVendor.Category_ID = session.draft.categoryId || existingVendor.Category_ID;
          existingVendor.Status = 'ACTIVE';
          existingVendor.Language = session.language;
          existingVendor.LocationConsent = true;
          existingVendor.ConsentTimestamp = new Date();
          existingVendor.LastLocationUpdate = new Date();
          await existingVendor.save();
        }

        // Record active consent in Sessions
        await recordConsent(existingVendor._id, rawSender, true);

        // Ingest location to Location collection
        const ingestedLoc = await ingestVendorLocation(existingVendor._id, latitude, longitude);
        if (ingestedLoc?.geo) {
          matchAndNotifyResidents(existingVendor._id, ingestedLoc.geo).catch((err) =>
            console.error('[botService.matchAndNotifyResidents]', err.message)
          );
        }

        session.step = 'REGISTERED';
        session.vendorId = existingVendor._id;
        session.lastActive = new Date();
        await session.save();

        const catName = session.draft.categoryName || 'General';
        const displayCat = isTa ? CATEGORY_TRANSLATIONS[catName] || catName : catName;

        return isTa
          ? `✅ *பதிவு வெற்றிகரமாக முடிந்தது & நீங்கள் ஆன்லைனில் 🟢 உள்ளீர்கள்!*\n\n` +
              `🏪 கடை பெயர்: *${existingVendor.Name}*\n` +
              `📦 வகை: ${displayCat}\n` +
              `🚚 வாகனம்: ${existingVendor.Vehicle}\n` +
              `🟢 நிலை: அருகிலுள்ள மக்களுக்கு ஒளிபரப்பப்படுகிறது\n\n` +
              `கட்டளைகள்:\n` +
              `1. இருப்பிடத்தை புதுப்பிக்கவும் (GPS Pin அனுப்பவும்)\n` +
              `2. ஆஃப்லைனுக்கு செல்லவும்\n` +
              `3. கணக்கு விவரங்களைப் பார்க்கவும்\n` +
              `4. மொழியை மாற்றவும் (Change to English)\n\n` +
              `எண்ணை மட்டும் அனுப்பவும்.`
          : `✅ *Registration Complete & You are now ONLINE 🟢!*\n\n` +
              `🏪 Shop: *${existingVendor.Name}*\n` +
              `📦 Category: ${displayCat}\n` +
              `🚚 Vehicle: ${existingVendor.Vehicle}\n` +
              `🟢 Status: Broadcasting to nearby residents\n\n` +
              `Options:\n` +
              `1. Update Location (Send GPS Pin)\n` +
              `2. Go Offline\n` +
              `3. View Account Details\n` +
              `4. Change Language (தமிழுக்கு மாறவும்)\n\n` +
              `Reply with a number.`;
      }

      // If vendor is already registered and updating their location pin
      if (session.step === 'REGISTERED' && existingVendor) {
        // Check if consent is active
        const sessionDoc = await Sessions.findOne({ Vendor_ID: existingVendor._id }).lean();
        if (!sessionDoc || !sessionDoc.Consent) {
          session.step = 'LOCATION_CONSENT';
          await session.save();
          return isTa
            ? `⚠️ இருப்பிடத்தைப் புதுப்பிக்க முதலில் இருப்பிடப் பகிர்வு ஒப்புதலை ஏற்க வேண்டும்.\n\n` + buildConsentPrompt('ta')
            : `⚠️ You must grant location-sharing consent before your location can be broadcast.\n\n` + buildConsentPrompt('en');
        }

        const updatedLoc = await ingestVendorLocation(existingVendor._id, latitude, longitude);
        existingVendor.Status = 'ACTIVE';
        await existingVendor.save();
        if (updatedLoc?.geo) {
          matchAndNotifyResidents(existingVendor._id, updatedLoc.geo).catch((err) =>
            console.error('[botService.matchAndNotifyResidents]', err.message)
          );
        }

        session.lastActive = new Date();
        await session.save();

        return isTa
          ? `📍 *இருப்பிடம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!*\n` +
              `நீங்கள் தற்போது குடியிருப்பாளர்களுக்கு *ஆன்லைனில் 🟢* காட்டப்படுகிறீர்கள்.\n\n` +
              `ஆஃப்லைனுக்கு செல்ல 2 என அனுப்பவும்.`
          : `📍 *Location updated successfully!*\n` +
              `You are now broadcast as *ONLINE 🟢* to nearby residents.\n\n` +
              `Reply 2 to go offline anytime.`;
      }

      // Unregistered user sending location pin directly
      return isTa
        ? `தொடங்குவதற்கு *hi* என்று அனுப்பவும்.`
        : `Welcome to VendiConnect! Please send *hi* to get started.`;
    }

    // 3. Handle Standalone 'hi' Activation Rule
    if (isStandaloneHi) {
      // If vendor is already registered, show their control menu
      if (existingVendor && session.step === 'REGISTERED') {
        session.lastActive = new Date();
        await session.save();
        return formatRegisteredVendorMenu(existingVendor, session.language);
      }

      // If vendor is in the middle of an incomplete registration, start/restart language selection
      session.step = 'LANGUAGE_SELECT';
      session.draft = {
        shopName: '',
        categoryId: null,
        categoryName: '',
        vehicle: '',
        consent: null,
      };
      session.lastActive = new Date();
      await session.save();

      return (
        `👋 *Welcome to VendiConnect!*\n\n` +
        `Choose your language / உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்:\n\n` +
        `1. தமிழ்\n` +
        `2. English\n\n` +
        `Reply with a number / எண்ணை மட்டும் அனுப்பவும்.`
      );
    }

    // 3b. Handle cancellation during in-progress registration
    const isCancel = /^(cancel|0|ரத்து|reset)$/i.test(raw);
    if (isCancel && session.step !== 'REGISTERED' && session.step !== 'IDLE') {
      session.step = 'IDLE';
      session.draft = {
        shopName: '',
        categoryId: null,
        categoryName: '',
        vehicle: '',
        consent: null,
      };
      session.lastActive = new Date();
      await session.save();
      return isTa
        ? `❌ பதிவு ரத்து செய்யப்பட்டது. மீண்டும் தொடங்க *hi* என அனுப்பவும்.`
        : `❌ Registration cancelled. Send *hi* anytime to start over.`;
    }

    // 3c. Explicit offline / stop command for registered vendors
    const isStopCommand = /^(stop|offline|ஆஃப்லைன்|நிறுத்து)$/i.test(raw);
    if (isStopCommand && existingVendor) {
      await withdrawConsent(existingVendor._id);
      existingVendor.Status = 'INACTIVE';
      existingVendor.LocationConsent = false;
      await existingVendor.save();
      session.lastActive = new Date();
      await session.save();
      return isTa
        ? `🛑 *நீங்கள் இப்போது ஆஃப்லைனில் 🔴 உள்ளீர்கள்.*\nகுடியிருப்பாளர்கள் உங்கள் வண்டியைப் பார்க்க முடியாது.\n\nமீண்டும் ஆன்லைனுக்கு வர 2 அல்லது GPS Pin அனுப்பவும்.`
        : `🛑 *You are now OFFLINE 🔴.*\nNearby residents can no longer discover your cart.\n\nReply 2 or send your GPS Pin anytime to go back online.`;
    }

    // 3d. Explicit start / online command for registered vendors
    const isStartCommand = /^(start|online|ஆன்லைன்|தொடங்கு)$/i.test(raw);
    if (isStartCommand && existingVendor) {
      session.step = 'AWAITING_LOCATION';
      session.lastActive = new Date();
      await session.save();
      return isTa
        ? `🟢 *ஆன்லைனுக்கு வர தயவுசெய்து உங்கள் தற்போதைய GPS Pin-ஐ அனுப்பவும்:*\n📎 -> 'Location' -> 'Send Your Current Location'.`
        : `🟢 *To go online, please share your current GPS location pin:*\nTap 📎 -> 'Location' -> 'Send Your Current Location'.`;
    }

    // 4. If user sends non-'hi' message while in IDLE state
    if (session.step === 'IDLE' && !existingVendor) {
      return (
        `👋 Welcome to VendiConnect!\n` +
        `Please send *hi* to get started.\n\n` +
        `வெண்டிகனெக்ட்-க்கு நல்வரவு!\n` +
        `தொடங்குவதற்கு *hi* என்று அனுப்பவும்.`
      );
    }

    // 5. State: LANGUAGE_SELECT
    if (session.step === 'LANGUAGE_SELECT') {
      const isChoiceTa = raw === '1' || /^tamil$/i.test(raw) || raw === 'தமிழ்';
      const isChoiceEn = raw === '2' || /^english$/i.test(raw) || raw === 'ஆங்கிலம்';

      if (isChoiceTa) {
        session.language = 'ta';
        session.step = 'SHOP_NAME';
        session.lastActive = new Date();
        await session.save();

        return (
          `வணக்கம்! VendiConnect-ல் இணைந்தமைக்கு நன்றி.\n\n` +
          `உங்கள் *கடை அல்லது வணிகப் பெயரை* உள்ளிடவும்:`
        );
      }

      if (isChoiceEn) {
        session.language = 'en';
        session.step = 'SHOP_NAME';
        session.lastActive = new Date();
        await session.save();

        return (
          `Welcome! Thank you for joining VendiConnect.\n\n` +
          `Please enter your *shop or business name*:`
        );
      }

      // Invalid input - do NOT advance state
      return (
        `❌ Invalid choice. Please reply with 1 for தமிழ் or 2 for English.\n\n` +
        `தவறான தேர்வு. தயவுசெய்து தமிழிற்கு 1 அல்லது ஆங்கிலத்திற்கு 2 என பதிலளிக்கவும்.`
      );
    }

    // 6. State: SHOP_NAME (Free-text validation)
    if (session.step === 'SHOP_NAME') {
      if (raw.length < 2 || raw.length > 100) {
        return isTa
          ? `❌ கடை பெயர் குறைந்தது 2 எழுத்துக்கள் மற்றும் அதிகபட்சம் 100 எழுத்துக்கள் இருக்க வேண்டும்.\nதயவுசெய்து மீண்டும் உள்ளிடவும்:`
          : `❌ Shop name must be between 2 and 100 characters.\nPlease enter your shop name:`;
      }

      session.draft.shopName = raw;
      session.step = 'CATEGORY_SELECT';
      session.lastActive = new Date();
      await session.save();

      const { text: categoryMenu } = await buildCategoryMenu(session.language);
      return categoryMenu;
    }

    // 7. State: CATEGORY_SELECT
    if (session.step === 'CATEGORY_SELECT') {
      const categories = await Category.find({}).sort({ Name: 1 }).lean();
      const choice = parseInt(raw, 10);

      if (!Number.isFinite(choice) || choice < 1 || choice > categories.length) {
        return isTa
          ? `❌ தவறான வகை தேர்வு. தயவுசெய்து 1 முதல் ${categories.length} வரையிலான எண்ணை அனுப்பவும்.`
          : `❌ Invalid category choice. Please reply with a number between 1 and ${categories.length}.`;
      }

      const selectedCat = categories[choice - 1];
      session.draft.categoryId = selectedCat._id;
      session.draft.categoryName = selectedCat.Name;
      session.step = 'VEHICLE_SELECT';
      session.lastActive = new Date();
      await session.save();

      return buildVehicleMenu(session.language);
    }

    // 8. State: VEHICLE_SELECT
    if (session.step === 'VEHICLE_SELECT') {
      const choice = parseInt(raw, 10);
      const vehicleOpt = VEHICLE_OPTIONS.find((v) => v.id === String(choice));

      if (!vehicleOpt) {
        return isTa
          ? `❌ தவறான தேர்வு. தயவுசெய்து 1 முதல் 5 வரையிலான எண்ணை அனுப்பவும்.`
          : `❌ Invalid choice. Please reply with a number between 1 and 5.`;
      }

      session.draft.vehicle = vehicleOpt.key;
      session.step = 'LOCATION_CONSENT';
      session.lastActive = new Date();
      await session.save();

      return buildConsentPrompt(session.language);
    }

    // 9. State: LOCATION_CONSENT
    if (session.step === 'LOCATION_CONSENT') {
      if (raw === '1') {
        // Vendor explicitly agrees to location sharing
        session.draft.consent = true;
        session.step = 'AWAITING_LOCATION';
        session.lastActive = new Date();
        await session.save();

        return buildRequestLocationPrompt(session.language);
      }

      if (raw === '2') {
        // Vendor declines location sharing
        session.draft.consent = false;

        // Persist vendor as INACTIVE (not eligible for discovery)
        let vendor = existingVendor;
        if (!vendor) {
          vendor = await Vendor.create({
            Name: session.draft.shopName,
            Phone: hashPhoneNumber(rawSender),
            Vehicle: session.draft.vehicle || 'Push Cart',
            Category_ID: session.draft.categoryId,
            Status: 'INACTIVE',
            Language: session.language,
            LocationConsent: false,
            ConsentTimestamp: new Date(),
            RegisteredVia: 'WHATSAPP',
          });
        } else {
          vendor.Status = 'INACTIVE';
          vendor.LocationConsent = false;
          vendor.ConsentTimestamp = new Date();
          await vendor.save();
        }

        // Record consent as declined / revoked
        await recordConsent(vendor._id, rawSender, false);

        session.step = 'REGISTERED';
        session.vendorId = vendor._id;
        session.lastActive = new Date();
        await session.save();

        return isTa
          ? `❌ *இருப்பிடப் பகிர்வு மறுக்கப்பட்டது.*\n\n` +
              `உங்கள் *${session.draft.shopName}* பதிவு சேமிக்கப்பட்டது. ` +
              `ஆனால் இருப்பிடப் பகிர்வு இல்லாமல் குடியிருப்பாளர்களுக்கு நீங்கள் ஆன்லைனில் காட்டப்பட மாட்டீர்கள்.\n\n` +
              `விற்பனையைத் தொடங்க தயாராகும்போது, கீழ்கண்ட எண்ணை அனுப்பவும்:\n` +
              `1. இருப்பிடத்தை இயக்கி ஆன்லைனுக்கு செல்லவும் (Go Online)\n` +
              `2. கணக்கு விவரங்களைப் பார்க்கவும்\n` +
              `3. மொழியை மாற்றவும்`
          : `❌ *Location sharing declined.*\n\n` +
              `Your registration for *${session.draft.shopName}* has been saved. ` +
              `However, you cannot be presented as online to neighborhood residents without consented location sharing.\n\n` +
              `When ready to start selling, reply with:\n` +
              `1. Enable Location & Go Online\n` +
              `2. View Account Details\n` +
              `3. Change Language`;
      }

      // Invalid option - do not advance
      return isTa
        ? `❌ தவறான தேர்வு. தயவுசெய்து ஒப்புக்கொள்ள 1 அல்லது மறுக்க 2 என பதிலளிக்கவும்.`
        : `❌ Invalid choice. Please reply with 1 to agree or 2 to decline.`;
    }

    // 10. State: AWAITING_LOCATION (Waiting for WhatsApp GPS Pin)
    if (session.step === 'AWAITING_LOCATION') {
      if (raw === '0') {
        session.step = 'REGISTERED';
        await session.save();
        return isTa ? `ரத்து செய்யப்பட்டது. மெனுவிற்குச் செல்ல *hi* என அனுப்பவும்.` : `Cancelled. Send *hi* for menu.`;
      }

      return isTa
        ? `📍 *இருப்பிடப் பின் தேவை:*\n\n` +
            `தயவுசெய்து உங்கள் WhatsApp இருப்பிடத்தை (Location Pin) அனுப்பவும்:\n` +
            `📎 -> 'Location' -> 'Send Your Current Location' (ஒரு முறை அனுப்பும் பின்).\n` +
            `நீங்கள் நகரும்போது இருப்பிடம் தானாகப் புதுப்பிக்கப்படாது; புதிய பின்னை அனுப்பவும்.\n\n` +
            `_ரத்து செய்ய 0 என பதிலளிக்கவும்._`
        : `📍 *Location Pin Required:*\n\n` +
            `Please share your WhatsApp GPS pin to start broadcasting:\n` +
            `Tap 📎 -> 'Location' -> 'Send Your Current Location' (one-time pin).\n` +
            `It will not update as you move; send another pin to refresh it.\n\n` +
            `_Reply 0 to cancel._`;
    }

    // 11. State: REGISTERED (Registered Vendor Interactive Menu)
    if (session.step === 'REGISTERED' && existingVendor) {
      if (raw === '1') {
        // Request location update
        return buildRequestLocationPrompt(session.language);
      }

      if (raw === '2') {
        // Toggle Online / Offline
        const isCurrentlyActive = existingVendor.Status === 'ACTIVE';

        if (isCurrentlyActive) {
          // Go Offline
          await withdrawConsent(existingVendor._id);
          existingVendor.Status = 'INACTIVE';
          await existingVendor.save();

          return isTa
            ? `🛑 *நீங்கள் இப்போது ஆஃப்லைனில் 🔴 உள்ளீர்கள்.*\n` +
                `குடியிருப்பாளர்கள் உங்கள் வண்டியைப் பார்க்க முடியாது.\n\n` +
                `மீண்டும் ஆன்லைனுக்கு வர 2 அல்லது GPS Pin அனுப்பவும்.`
            : `🛑 *You are now OFFLINE 🔴.*\n` +
                `Nearby residents can no longer discover your cart.\n\n` +
                `Reply 2 or send your GPS Pin anytime to go back online.`;
        } else {
          // Go Online: prompt for GPS pin to verify current position
          session.step = 'AWAITING_LOCATION';
          await session.save();

          return isTa
            ? `🟢 *ஆன்லைனுக்கு வர தயவுசெய்து உங்கள் தற்போதைய GPS Pin-ஐ அனுப்பவும்:*\n` +
                `📎 -> 'Location' -> 'Send Your Current Location' (ஒரு முறை அனுப்பும் பின்).`
            : `🟢 *To go online, please share your current GPS location pin:*\n` +
                `Tap 📎 -> 'Location' -> 'Send Your Current Location' (one-time pin).`;
        }
      }

      if (raw === '3') {
        // View Account Details
        const category = await Category.findById(existingVendor.Category_ID).lean();
        const catName = category?.Name || 'General';
        const displayCat = isTa ? CATEGORY_TRANSLATIONS[catName] || catName : catName;
        const statusText = isTa
          ? existingVendor.Status === 'ACTIVE'
            ? 'ஆன்லைன் 🟢'
            : 'ஆஃப்லைன் 🔴'
          : existingVendor.Status === 'ACTIVE'
          ? 'ONLINE 🟢'
          : 'OFFLINE 🔴';

        return isTa
          ? `📋 *உங்கள் கணக்கு விவரங்கள்:*\n\n` +
              `🏪 கடை பெயர்: *${existingVendor.Name}*\n` +
              `📦 வகை: ${displayCat}\n` +
              `🚚 வாகனம்: ${existingVendor.Vehicle}\n` +
              `⭐ மதிப்பீடு: ${existingVendor.AvgRating ? existingVendor.AvgRating.toFixed(1) : 'புதியது'}\n` +
              `📶 நிலை: *${statusText}*\n\n` +
              `மெனுவிற்கு 0 அல்லது *hi* என அனுப்பவும்.`
          : `📋 *Your Account Details:*\n\n` +
              `🏪 Shop: *${existingVendor.Name}*\n` +
              `📦 Category: ${displayCat}\n` +
              `🚚 Vehicle: ${existingVendor.Vehicle}\n` +
              `⭐ Rating: ${existingVendor.AvgRating ? existingVendor.AvgRating.toFixed(1) : 'New'}\n` +
              `📶 Status: *${statusText}*\n\n` +
              `Reply 0 or send *hi* for menu.`;
      }

      if (raw === '4') {
        // Change Language
        const newLang = session.language === 'ta' ? 'en' : 'ta';
        session.language = newLang;
        existingVendor.Language = newLang;
        await Promise.all([session.save(), existingVendor.save()]);

        return newLang === 'ta'
          ? `✅ மொழி வெற்றிகரமாக தமிழாக மாற்றப்பட்டது!\n\n` + formatRegisteredVendorMenu(existingVendor, 'ta')
          : `✅ Language successfully changed to English!\n\n` + formatRegisteredVendorMenu(existingVendor, 'en');
      }

      // Unrecognized number or command: re-display menu
      return formatRegisteredVendorMenu(existingVendor, session.language);
    }

    // Default catch-all
    return isTa
      ? `🤖 மன்னிக்கவும், புரியவில்லை. மெனுவிற்குச் செல்ல *hi* என அனுப்பவும்.`
      : `🤖 Sorry, I didn't recognize that command. Send *hi* to see available options.`;
  },

  async resetSession(rawSender) {
    const norm = normalizePhoneNumber(rawSender);
    const hash = hashPhoneNumber(rawSender);
    await BotSession.deleteMany({
      $or: [{ phone: rawSender }, { phone: norm }, { phone: hash }],
    });
    return { success: true };
  },
};
