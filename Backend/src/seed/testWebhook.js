/**
 * testWebhook.js — Interactive Mode
 * -----------------------------------------------
 * Simulates the WhatsApp registration conversation
 * interactively. YOU type replies in this terminal,
 * and the BOT's responses appear on your WhatsApp.
 *
 * Usage:
 *   node src/seed/testWebhook.js
 * -----------------------------------------------
 */

import fetch from 'node-fetch';
import readline from 'readline';

const BASE_URL = 'http://localhost:5000/api/whatsapp/webhook';
const YOUR_PHONE = '919384766429'; // Your real WhatsApp number

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function sendToWebhook(type, content) {
  const body = {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: YOUR_PHONE,
            type,
            ...(type === 'text'     ? { text: { body: content } } : {}),
            ...(type === 'location' ? { location: content }       : {}),
          }]
        }
      }]
    }]
  };

  await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function run() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' 🛒  VendiConnect — WhatsApp Registration Simulator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Type your reply here → Bot replies appear on WhatsApp');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Start conversation
  console.log('📤 Sending "Hi" to start registration...');
  await sendToWebhook('text', 'Hi');
  console.log('✅ Sent! Check WhatsApp — bot asked for your shop name.\n');

  // Step 2: Shop name
  const name = await ask('📝 Enter your shop name (as vendor): ');
  await sendToWebhook('text', name);
  console.log('✅ Sent! Check WhatsApp — bot showing category list.\n');

  // Step 3: Category
  const cat = await ask('📋 Enter category number (1–8): ');
  await sendToWebhook('text', cat);
  console.log('✅ Sent! Check WhatsApp — bot showing vehicle list.\n');

  // Step 4: Vehicle
  const vehicle = await ask('🚗 Enter vehicle number (1=Pushcart, 2=Cycle, 3=Auto, 4=Van): ');
  await sendToWebhook('text', vehicle);
  console.log('✅ Sent! Check WhatsApp — registration complete message!\n');

  await new Promise(r => setTimeout(r, 2000));

  // Step 5: Location
  const sendLoc = await ask('📍 Send a location now? (y/n): ');
  if (sendLoc.toLowerCase() === 'y') {
    await sendToWebhook('location', { latitude: 12.9716, longitude: 77.5946 });
    console.log('✅ Location sent! Check WhatsApp — you are now ACTIVE on the map!\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' ✅  Done! Check AdminDashboard & ResidentApp for vendor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  rl.close();
}

run().catch(console.error);
