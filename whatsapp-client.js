const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ── HARDCODED DATA ──────────────────────────────────────────────
const CATEGORIES = [
    'Vegetables', 
    'Fruits', 
    'Fish & Seafood', 
    'Snacks & Beverages', 
    'Flowers & Garlands'
];

const VEHICLES = [
    'Pushcart', 
    'Bicycle', 
    'Auto-rickshaw', 
    'Van'
];

// ── IN-MEMORY "DATABASE" ────────────────────────────────────────
// This replaces MongoDB as per the teacher's instructions
const vendorsDB = new Map(); // Stores registered vendors
const sessions = new Map();  // Stores temporary registration state

// ── INITIALIZE CLIENT ───────────────────────────────────────────
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    // Generates the QR code in the terminal
    qrcode.generate(qr, { small: true });
    console.log('\n[Bot] Scan the QR code above with WhatsApp to log in!');
});

client.on('ready', () => {
    console.log('[Bot] ✅ Hardcoded VendiConnect Bot is Ready!');
});

// ── MESSAGE HANDLER ─────────────────────────────────────────────
client.on('message_create', async (msg) => {
    // Ignore messages sent by the bot itself
    if (msg.fromMe) return;

    const chatId = msg.from;
    const text = msg.body.trim().toLowerCase();

    // ── 1. HANDLE LOCATION MESSAGES ──
    if (msg.type === 'location') {
        if (vendorsDB.has(chatId)) {
            const vendor = vendorsDB.get(chatId);
            vendor.status = 'ACTIVE';
            
            console.log(`[Location] Received from ${vendor.name}`);
            await client.sendMessage(chatId, `✅ Location received, *${vendor.name}*!\n\nYou are now live on the map. Type *stop* when you go offline.`);
        } else {
            await client.sendMessage(chatId, '⚠ Please register first by sending "hi".');
        }
        return;
    }

    // Only process text messages below this point
    if (msg.type !== 'chat') return;

    // ── 2. HANDLE RESET COMMAND ──
    if (text === 'reset') {
        sessions.delete(chatId);
        vendorsDB.delete(chatId);
        console.log(`[Reset] Cleared data for ${chatId}`);
        await client.sendMessage(chatId, '🔄 Account completely reset. Send *hi* to start over from scratch.');
        return;
    }

    // ── 3. HANDLE REGISTERED VENDORS ──
    if (vendorsDB.has(chatId)) {
        const vendor = vendorsDB.get(chatId);
        
        if (text === 'stop' || text === 'offline') {
            vendor.status = 'INACTIVE';
            await client.sendMessage(chatId, `👋 You are now *OFFLINE*, ${vendor.name}.`);
        } else if (text === 'hi' || text === 'hello') {
            await client.sendMessage(chatId, `Hi *${vendor.name}*! 👋\n\nSend a *location pin* 📍 to go live, or type *stop* to go offline.`);
        }
        return;
    }

    // ── 4. REGISTRATION STATE MACHINE ──
    const session = sessions.get(chatId) || { state: 'IDLE' };

    // Step A: Start
    if (session.state === 'IDLE') {
        if (text === 'hi' || text === 'hello') {
            sessions.set(chatId, { state: 'AWAITING_NAME' });
            await client.sendMessage(chatId, '👋 Welcome to *VendiConnect*!\n\nWhat is your shop or vendor name?');
        }
        return;
    }

    // Step B: Ask Category
    if (session.state === 'AWAITING_NAME') {
        // Save name, move to category
        sessions.set(chatId, { state: 'AWAITING_CATEGORY', name: msg.body.trim() });
        
        let catMsg = `Great, *${msg.body.trim()}*!\n\nPick your category by replying with a number:\n\n`;
        CATEGORIES.forEach((c, i) => {
            catMsg += `*${i + 1}.* ${c}\n`;
        });
        
        await client.sendMessage(chatId, catMsg);
        return;
    }

    // Step C: Ask Vehicle
    if (session.state === 'AWAITING_CATEGORY') {
        const choice = parseInt(text) - 1;
        
        if (choice >= 0 && choice < CATEGORIES.length) {
            const selectedCat = CATEGORIES[choice];
            sessions.set(chatId, { ...session, state: 'AWAITING_VEHICLE', category: selectedCat });
            
            let vehMsg = `✅ Category: *${selectedCat}*\n\nNow pick your vehicle type:\n\n`;
            VEHICLES.forEach((v, i) => {
                vehMsg += `*${i + 1}.* ${v}\n`;
            });
            
            await client.sendMessage(chatId, vehMsg);
        } else {
            await client.sendMessage(chatId, `⚠ Invalid option. Please reply with a number between 1 and ${CATEGORIES.length}.`);
        }
        return;
    }

    // Step D: Finish Registration
    if (session.state === 'AWAITING_VEHICLE') {
        const choice = parseInt(text) - 1;
        
        if (choice >= 0 && choice < VEHICLES.length) {
            const selectedVeh = VEHICLES[choice];
            
            // Save to our in-memory hardcoded database
            vendorsDB.set(chatId, {
                name: session.name,
                category: session.category,
                vehicle: selectedVeh,
                status: 'INACTIVE'
            });
            
            // Clear temporary session
            sessions.delete(chatId);
            
            console.log(`[Bot] ✅ New vendor registered: ${session.name}`);
            await client.sendMessage(chatId, `🎊 *Registration Complete!*\n\nName: *${session.name}*\nCategory: *${session.category}*\nVehicle: *${selectedVeh}*\n\nWhenever you're out, send a *location pin* 📍 to go live on the map!`);
        } else {
            await client.sendMessage(chatId, `⚠ Invalid option. Please reply with a number between 1 and ${VEHICLES.length}.`);
        }
        return;
    }
});

client.initialize();
