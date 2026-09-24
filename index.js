const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// basic data arrays
const categories = ['Vegetables', 'Fruits', 'Fish & Seafood', 'Snacks & Beverages', 'Flowers & Garlands', 'Dairy Products', 'Breakfast & Tiffin'];
const vehicles = ['Pushcart', 'Bicycle', 'Auto-rickshaw', 'Van'];
const vehicles_ta = ['தள்ளுவண்டி (Pushcart)', 'மிதிவண்டி (Cycle)', 'ஆட்டோ (Auto-rickshaw)', 'வேன் (Van)'];

const category_ta = {
    'Vegetables': 'காய்கறிகள் (Vegetables)',
    'Fruits': 'பழங்கள் (Fruits)',
    'Fish & Seafood': 'மீன் & கடல் உணவுகள் (Fish & Seafood)',
    'Snacks & Beverages': 'தின்பண்டங்கள் (Snacks & Beverages)',
    'Flowers & Garlands': 'பூக்கள் & மாலைகள் (Flowers & Garlands)',
    'Dairy Products': 'பால் பொருட்கள் (Dairy Products)',
    'Breakfast & Tiffin': 'காலை உணவு (Breakfast & Tiffin)'
};

function getCategoryName(name, lang) {
    if (lang === 'ta' && category_ta[name]) return category_ta[name];
    return name;
}

// text messages
const messages = {
    en: {
        welcome: `👋 Welcome to *VendiConnect*!\n\nWhat is your shop name?\n_(e.g. Ram Fresh Vegetables)_`,
        invalidName: `⚠ Please enter a valid name.`,
        pickCategory: (name, list) => `Great, *${name}*! 🎉\n\nPick your *category* (reply with number):\n\n${list}`,
        invalidOption: (max, list) => `⚠ Reply with a number 1–${max}:\n\n${list}`,
        pickVehicle: (catName, list) => `✅ Category: *${catName}*\n\nNow pick your *vehicle type* (reply with number):\n\n${list}`,
        askConsent: `⚠️ *Location Consent*\n\nVendiConnect will share your live location with nearby residents _only_ when you send a location pin.\n\nDo you agree to share your location?\n*1.* Yes, I agree\n*2.* No, cancel registration`,
        consentDenied: `❌ Registration cancelled. Location sharing is required.`,
        regComplete: (name, cat, veh) => `🎊 *Registration Complete!*\n\nName: *${name}*\nCategory: *${cat}*\nVehicle: *${veh}*\n\nWhenever you're out, send a *location pin* 📍 to go live!`,
        offlineMsg: (name) => `👋 You are now *OFFLINE*, ${name}.\n\nSend your location again when you're back out!`,
        helloLive: (name) => `Hi *${name}*! 👋\n\nSend a *location pin* 📍 to go live on the map.\n\nType *STOP* to go offline.`
    },
    ta: {
        welcome: `👋 *VendiConnect* இற்கு வரவேற்கிறோம்!\n\nஉங்கள் கடையின் பெயர் என்ன?\n_(உதாரணம்: ராம் காய்கறிகள்)_`,
        invalidName: `⚠ சரியான பெயரை உள்ளிடவும்.`,
        pickCategory: (name, list) => `நன்று, *${name}*! 🎉\n\nஉங்கள் *வியாபார வகையை* தேர்ந்தெடுக்கவும் (எண்ணை அனுப்பவும்):\n\n${list}`,
        invalidOption: (max, list) => `⚠ 1–${max} குள் ஒரு எண்ணை அனுப்பவும்:\n\n${list}`,
        pickVehicle: (catName, list) => `✅ வகை: *${catName}*\n\nஉங்கள் *வாகன வகையை* தேர்ந்தெடுக்கவும் (எண்ணை அனுப்பவும்):\n\n${list}`,
        askConsent: `⚠️ *இடம் பகிர்தல் சம்மதம் (Location Consent)*\n\nநீங்கள் location pin அனுப்பும்போது மட்டுமே உங்கள் இடம் அருகிலுள்ள வாடிக்கையாளர்களுக்கு காட்டப்படும்.\n\nஉங்கள் இடத்தை பகிர சம்மதிக்கிறீர்களா?\n*1.* ஆம், சம்மதிக்கிறேன் (Yes)\n*2.* இல்லை, வேண்டாம் (No)`,
        consentDenied: `❌ பதிவு ரத்து செய்யப்பட்டது. VendiConnect ஐ பயன்படுத்த இடம் பகிர்தல் கட்டாயமாகும்.`,
        regComplete: (name, cat, veh) => `🎊 *பதிவு முடிந்தது!*\n\nபெயர்: *${name}*\nவகை: *${cat}*\nவாகனம்: *${veh}*\n\nவியாபாரம் தொடங்கும்போது, உங்கள் *location pin* 📍 அனுப்பவும்!`,
        offlineMsg: (name) => `👋 நீங்கள் இப்போது *OFFLINE* இல் உள்ளீர்கள், ${name}.\n\nமீண்டும் கடையை திறக்கும்போது location அனுப்பவும்!`,
        helloLive: (name) => `வணக்கம் *${name}*! 👋\n\nஉங்கள் கடையை வரைபடத்தில் காட்ட *location pin* 📍 அனுப்பவும்.\n\nகடையை மூட *STOP* என தட்டச்சு செய்யவும்.`
    }
};

// local json file for storing data
const dbFile = path.join(__dirname, 'db.json');

function getDb() {
    if (!fs.existsSync(dbFile)) {
        fs.writeFileSync(dbFile, JSON.stringify({ vendors: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
}

function saveVendor(phone, data) {
    const db = getDb();
    db.vendors[phone] = data;
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function getVendor(phone) {
    const db = getDb();
    return db.vendors[phone] || null;
}

function deleteVendor(phone) {
    const db = getDb();
    delete db.vendors[phone];
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function updateStatus(phone, status) {
    const db = getDb();
    if (db.vendors[phone]) {
        db.vendors[phone].status = status;
        fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
    }
}

// memory storage for active setups
const tempSessions = new Map();

// setup whatsapp client
const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code to log in!');
});

client.on('ready', () => {
    console.log('Bot is ready!');
});

// incoming messages
client.on('message_create', async (msg) => {
    if (msg.fromMe) return;

    const chatId = msg.from;
    const text = msg.body.trim().toLowerCase();
    const vendor = getVendor(chatId);

    // location sharing
    if (msg.type === 'location') {
        if (vendor) {
            updateStatus(chatId, 'ACTIVE');
            const langTexts = messages[vendor.language || 'en'];
            await client.sendMessage(chatId, `✅ Location received, *${vendor.name}*!\n\nYou are now live on the map. Type *stop* when you go offline.`);
        } else {
            await client.sendMessage(chatId, '⚠ Please register first by sending "hi".');
        }
        return;
    }

    if (msg.type !== 'chat') return;

    // reset command to delete account
    if (text === 'reset' || text === 'cancel' || text === 'ரத்து') {
        if (vendor) {
            deleteVendor(chatId);
            await client.sendMessage(chatId, `Account deleted! Type *hi* to register again.`);
        } else {
            tempSessions.delete(chatId);
            await client.sendMessage(chatId, `Registration cancelled. Type *hi* to start over.`);
        }
        return;
    }

    // handle already registered users
    if (vendor) {
        const lang = vendor.language || 'en';
        const langTexts = messages[lang];

        if (text === 'stop' || text === 'offline') {
            updateStatus(chatId, 'INACTIVE');
            await client.sendMessage(chatId, langTexts.offlineMsg(vendor.name));
        } else if (text === 'hi' || text === 'hello' || text === 'vanakkam') {
            await client.sendMessage(chatId, langTexts.helloLive(vendor.name));
        }
        return;
    }

    // registration steps
    const session = tempSessions.get(chatId) || { state: 'START' };

    if (session.state === 'START') {
        if (text === 'hi' || text === 'hello' || text === 'vanakkam') {
            tempSessions.set(chatId, { state: 'LANG' });
            await client.sendMessage(chatId, `Welcome! Vanakkam! 🙏\n\nChoose language / மொழியை தேர்ந்தெடுக்கவும்:\n\n*1.* தமிழ் (Tamil)\n*2.* English`);
        }
        return;
    }

    if (session.state === 'LANG') {
        const choice = parseInt(text, 10);
        if (choice === 1 || choice === 2) {
            const lang = choice === 1 ? 'ta' : 'en';
            tempSessions.set(chatId, { state: 'NAME', lang: lang });
            await client.sendMessage(chatId, messages[lang].welcome);
        } else {
            await client.sendMessage(chatId, `⚠ 1. தமிழ்\n2. English\n\nReply with 1 or 2.`);
        }
        return;
    }

    const lang = session.lang || 'en';
    const langTexts = messages[lang];

    if (session.state === 'NAME') {
        tempSessions.set(chatId, { state: 'CATEGORY', lang: lang, name: msg.body.trim() });
        let catText = '';
        categories.forEach((c, i) => catText += `*${i + 1}.* ${getCategoryName(c, lang)}\n`);
        await client.sendMessage(chatId, langTexts.pickCategory(msg.body.trim(), catText));
        return;
    }

    if (session.state === 'CATEGORY') {
        const choice = parseInt(text, 10) - 1;
        if (choice >= 0 && choice < categories.length) {
            const selectedCat = categories[choice];
            tempSessions.set(chatId, { ...session, state: 'VEHICLE', category: selectedCat });
            
            const vList = lang === 'ta' ? vehicles_ta : vehicles;
            let vehText = '';
            vList.forEach((v, i) => vehText += `*${i + 1}.* ${v}\n`);
            await client.sendMessage(chatId, langTexts.pickVehicle(getCategoryName(selectedCat, lang), vehText));
        } else {
            const catText = categories.map((c, i) => `*${i + 1}.* ${getCategoryName(c, lang)}`).join('\n');
            await client.sendMessage(chatId, langTexts.invalidOption(categories.length, catText));
        }
        return;
    }

    if (session.state === 'VEHICLE') {
        const choice = parseInt(text, 10) - 1;
        if (choice >= 0 && choice < vehicles.length) {
            const selectedVeh = vehicles[choice];
            const displayVeh = (lang === 'ta' ? vehicles_ta : vehicles)[choice];
            
            tempSessions.set(chatId, { ...session, state: 'CONSENT', vehicle: selectedVeh, displayVeh: displayVeh });
            await client.sendMessage(chatId, langTexts.askConsent);
        } else {
            const vList = lang === 'ta' ? vehicles_ta : vehicles;
            const vehText = vList.map((v, i) => `*${i + 1}.* ${v}`).join('\n');
            await client.sendMessage(chatId, langTexts.invalidOption(vehicles.length, vehText));
        }
        return;
    }

    if (session.state === 'CONSENT') {
        const choice = parseInt(text, 10);
        
        if (choice === 2) {
            await client.sendMessage(chatId, langTexts.consentDenied);
            tempSessions.delete(chatId);
            return;
        } else if (choice !== 1) {
            await client.sendMessage(chatId, langTexts.invalidOption(2, (lang === 'ta' ? '*1.* ஆம் (Yes)\n*2.* இல்லை (No)' : '*1.* Yes\n*2.* No')));
            return;
        }

        // save to file
        saveVendor(chatId, {
            name: session.name,
            category: session.category,
            vehicle: session.vehicle,
            language: lang,
            locationConsent: true,
            status: 'INACTIVE',
            registeredAt: new Date().toISOString()
        });
        
        tempSessions.delete(chatId);
        
        console.log(`New vendor registered: ${session.name}`);
        await client.sendMessage(chatId, langTexts.regComplete(session.name, getCategoryName(session.category, lang), session.displayVeh));
        return;
    }
});

client.initialize();
