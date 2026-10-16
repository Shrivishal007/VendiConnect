/**
 * controllers/whatsappController.js
 * -----------------------------------------------------------------------
 * Week 1-2: Webhook verification + incoming message handling.
 * Week 3+:  Conversational vendor REGISTRATION via WhatsApp.
 *
 * Registration state machine (per phone number, in-memory):
 *   IDLE → AWAITING_NAME → AWAITING_CATEGORY → AWAITING_VEHICLE → DONE
 *
 * All category/vehicle selection is done by typing a number — no
 * interactive lists needed (those require a verified Business number).
 * -----------------------------------------------------------------------
 */

import crypto from 'crypto';
import Vendor from '../models/Vendor.js';
import Category from '../models/Category.js';
import VendorLocation from '../models/VendorLocation.js';
import { sendTextMessage } from '../services/whatsappService.js';

// ── Phone hashing (HMAC-SHA256, must match vendorController.js) ──────────
const hashPhoneNumber = (phone) => {
  const secret = process.env.PHONE_HASH_SECRET || 'vendiconnect_default_secret';
  return crypto.createHmac('sha256', secret).update(String(phone).trim()).digest('hex');
};

// ── Privacy: approximate GPS ─────────────────────────────────────────────
const toApproximateGeoPoint = (lat, lng) => ({
  type: 'Point',
  coordinates: [
    Math.round(lng * 1000) / 1000,
    Math.round(lat * 1000) / 1000,
  ],
});

const LOCATION_TTL_MINUTES = parseInt(process.env.LOCATION_TTL_MINUTES, 10) || 30;

// ── In-memory session store ──────────────────────────────────────────────
// { phoneNumber: { state, name, categoryIndex } }
// States: IDLE | AWAITING_NAME | AWAITING_CATEGORY | AWAITING_VEHICLE
const sessions = new Map();

const VEHICLES = ['Pushcart', 'Cycle', 'Auto-rickshaw', 'Van'];

// ── Webhook verification (GET) ───────────────────────────────────────────
export const verifyWebhook = (req, res) => {
  const mode  = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified successfully.');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// ── Main message handler (POST) ──────────────────────────────────────────
export const handleIncomingMessage = async (req, res) => {
  res.sendStatus(200); // Respond immediately so Meta doesn't retry

  try {
    const entry   = req.body?.entry?.[0];
    const change  = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message) return; // status updates / delivery receipts — ignore

    const from = message.from;
    const phoneHash = hashPhoneNumber(from);

    // ── Is this a registered vendor? ─────────────────────────────────
    const vendor = await Vendor.findOne({ PhoneHash: phoneHash });

    if (vendor) {
      await handleRegisteredVendor(from, vendor, message);
    } else {
      await handleRegistration(from, phoneHash, message);
    }
  } catch (err) {
    console.error('[whatsappController]', err);
  }
};

// ── Registered vendor flow ───────────────────────────────────────────────
async function handleRegisteredVendor(from, vendor, message) {
  if (message.type === 'text') {
    const text = (message.text.body || '').trim().toLowerCase();

    if (text === 'stop' || text === 'offline') {
      await Vendor.updateOne({ _id: vendor._id }, { $set: { Status: 'INACTIVE' } });
      await sendTextMessage(from,
        `👋 You are now marked *OFFLINE*, ${vendor.VendorName}.\n\nSend your location again when you're back out!`
      );
      return;
    }

    await sendTextMessage(from,
      `Hi ${vendor.VendorName}! 👋\n\nSend a *location pin* 📍 to go live on the resident map.\n\nType *STOP* to go offline.`
    );
  } else if (message.type === 'location') {
    const { latitude, longitude } = message.location;
    const geoPoint  = toApproximateGeoPoint(latitude, longitude);
    const now       = new Date();
    const expiresAt = new Date(now.getTime() + LOCATION_TTL_MINUTES * 60 * 1000);

    await VendorLocation.findOneAndUpdate(
      { Vendor_ID: vendor._id },
      { Vendor_ID: vendor._id, geo: geoPoint, UpdatedAt: now, ExpiresAt: expiresAt },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await Vendor.updateOne({ _id: vendor._id }, { $set: { Status: 'ACTIVE' } });

    console.log(`[WhatsApp] Location updated for ${vendor.VendorName}: ${latitude}, ${longitude}`);
    await sendTextMessage(from,
      `✅ Location updated, *${vendor.VendorName}*!\n\nYou're now *ACTIVE* on the map for the next ${LOCATION_TTL_MINUTES} minutes. 🗺️\n\nType *STOP* when you want to go offline.`
    );
  }
}

// ── Registration flow (state machine) ───────────────────────────────────
async function handleRegistration(from, phoneHash, message) {
  const text = (message.text?.body || message.interactive?.button_reply?.title || '').trim();
  const session = sessions.get(from) || { state: 'IDLE' };

  // ── IDLE: any message starts registration ─────────────────────────
  if (session.state === 'IDLE') {
    sessions.set(from, { state: 'AWAITING_NAME' });
    await sendTextMessage(from,
      `👋 Welcome to *VendiConnect*!\n\nLet's register you as a vendor — it takes less than 1 minute.\n\n*What is your vendor/shop name?*\n\n_(e.g. Ram Fresh Vegetables)_`
    );
    return;
  }

  // ── AWAITING_NAME ─────────────────────────────────────────────────
  if (session.state === 'AWAITING_NAME') {
    if (!text || text.length < 2) {
      await sendTextMessage(from, '⚠ Please enter a valid name (at least 2 characters).');
      return;
    }
    const categories = await Category.find({}).lean();
    if (!categories.length) {
      await sendTextMessage(from, '⚠ No categories configured yet. Please contact admin.');
      sessions.delete(from);
      return;
    }

    sessions.set(from, { state: 'AWAITING_CATEGORY', name: text, categories });

    const list = categories.map((c, i) => `*${i + 1}.* ${c.Name}`).join('\n');
    await sendTextMessage(from,
      `Great, *${text}*! 🎉\n\nNow pick your *category* by replying with the number:\n\n${list}`
    );
    return;
  }

  // ── AWAITING_CATEGORY ─────────────────────────────────────────────
  if (session.state === 'AWAITING_CATEGORY') {
    const choice = parseInt(text, 10);
    if (!choice || choice < 1 || choice > session.categories.length) {
      const list = session.categories.map((c, i) => `*${i + 1}.* ${c.Name}`).join('\n');
      await sendTextMessage(from,
        `⚠ Please reply with a number between 1 and ${session.categories.length}:\n\n${list}`
      );
      return;
    }

    const selectedCategory = session.categories[choice - 1];
    sessions.set(from, {
      ...session,
      state: 'AWAITING_VEHICLE',
      categoryId: selectedCategory._id,
      categoryName: selectedCategory.Name,
    });

    const vehicleList = VEHICLES.map((v, i) => `*${i + 1}.* ${v}`).join('\n');
    await sendTextMessage(from,
      `Perfect! Category: *${selectedCategory.Name}* ✅\n\nNow pick your *vehicle type*:\n\n${vehicleList}`
    );
    return;
  }

  // ── AWAITING_VEHICLE ──────────────────────────────────────────────
  if (session.state === 'AWAITING_VEHICLE') {
    const choice = parseInt(text, 10);
    if (!choice || choice < 1 || choice > VEHICLES.length) {
      const vehicleList = VEHICLES.map((v, i) => `*${i + 1}.* ${v}`).join('\n');
      await sendTextMessage(from,
        `⚠ Please reply with a number between 1 and ${VEHICLES.length}:\n\n${vehicleList}`
      );
      return;
    }

    const vehicle = VEHICLES[choice - 1];

    // Save vendor to DB
    const phoneHash2 = hashPhoneNumber(from);
    try {
      const vendor = await Vendor.create({
        VendorName: session.name.trim(),
        PhoneHash: phoneHash2,
        Vehicle: vehicle,
        Category_ID: session.categoryId,
        Status: 'INACTIVE',
      });

      sessions.delete(from); // Clear session

      console.log(`[WhatsApp] New vendor registered via WhatsApp: ${vendor.VendorName}`);
      await sendTextMessage(from,
        `🎊 *Registration Complete!*\n\n` +
        `Name: *${vendor.VendorName}*\n` +
        `Category: *${session.categoryName}*\n` +
        `Vehicle: *${vehicle}*\n\n` +
        `You're all set! Whenever you're out selling, send us a *location pin* 📍 and residents nearby will be able to find you on the map. 🗺️`
      );
    } catch (err) {
      sessions.delete(from);
      if (err.code === 11000) {
        await sendTextMessage(from,
          '⚠ This phone number is already registered. Please contact admin if you need to update your details.'
        );
      } else {
        console.error('[handleRegistration] DB error:', err);
        await sendTextMessage(from, '⚠ Something went wrong. Please try again later.');
      }
    }
    return;
  }
}
