/**
 * testWebhook.js
 * 
 * Run this script to simulate incoming messages from the WhatsApp Cloud API.
 * This allows you to test your webhook integration locally without needing 
 * Ngrok or the Meta Developer Dashboard configured yet.
 * 
 * Usage: 
 * 1. Start your backend server (npm run dev)
 * 2. In a new terminal, run: node testWebhook.js
 */

import fetch from 'node-fetch'; // Ensure node-fetch is installed, or use native fetch if Node >= 18

const WEBHOOK_URL = 'http://localhost:5000/api/whatsapp/webhook';
const TEST_SENDER_PHONE = '919345602949'; // Replace with a phone number that is hashed and exists in your Vendor DB

// Helper function to send the POST request
async function sendWebhookEvent(messagePayload) {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '16505551111',
                phone_number_id: '1278697741990302'
              },
              contacts: [
                {
                  profile: { name: 'Test Vendor' },
                  wa_id: TEST_SENDER_PHONE
                }
              ],
              messages: [messagePayload]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  try {
    console.log(`Sending simulated ${messagePayload.type} message to webhook...`);
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`Webhook responded with status: ${response.status}`);
  } catch (error) {
    console.error('Error sending webhook event:', error.message);
    console.log('Is your backend server running on port 5000?');
  }
}

async function runTests() {
  // 1. Simulate an incoming TEXT message
  const textMessage = {
    from: TEST_SENDER_PHONE,
    id: 'wamid.HBgLMTIzNDU2Nzg5MBUCABEYEFY4RDBBMzRGQzRFNkVBRjc=',
    timestamp: Date.now().toString(),
    text: { body: 'Hello! I am online.' },
    type: 'text'
  };
  
  await sendWebhookEvent(textMessage);

  // Wait a couple of seconds before sending the next one
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 2. Simulate an incoming LOCATION pin
  const locationMessage = {
    from: TEST_SENDER_PHONE,
    id: 'wamid.HBgLMTIzNDU2Nzg5MBUCABEYEFY4RDBBMzRGQzRFNkVBRjc=',
    timestamp: Date.now().toString(),
    location: {
      latitude: 12.9716,   // Example coordinates (Bangalore)
      longitude: 77.5946,
      name: 'My Pushcart Location'
    },
    type: 'location'
  };

  await sendWebhookEvent(locationMessage);
}

runTests();
