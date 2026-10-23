import 'dotenv/config';
import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';
import Resident from '../models/Resident.js';
import Location from '../models/Location.js';
import Sessions from '../models/Sessions.js';
import Alert from '../models/Alert.js';
import AlertThrottle from '../models/AlertThrottle.js';
import Ratings from '../models/Ratings.js';
import Preferences from '../models/Preferences.js';
import ActivityLog from '../models/ActivityLog.js';
import AdminUser from '../models/AdminUser.js';
import BotSession from '../models/BotSession.js';

async function cleanup() {
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase();
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!defaultAdminEmail || !defaultAdminPassword) {
    throw new Error('DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD must be set before cleanup.');
  }

  console.log('[Cleanup] Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[Cleanup] Connected.');

  // 1. Clean up demo admin users, keeping only default admin
  const deletedAdmins = await AdminUser.deleteMany({ Email: { $ne: defaultAdminEmail } });
  console.log(`[Cleanup] Deleted ${deletedAdmins.deletedCount} demo admin accounts. Kept: ${defaultAdminEmail}`);

  // Ensure the configured super admin exists and has the configured password.
  let admin = await AdminUser.findOne({ Email: defaultAdminEmail }).select('+Password');
  if (!admin) {
    admin = await AdminUser.create({
      Email: defaultAdminEmail,
      Password: await AdminUser.hashPassword(defaultAdminPassword),
      Role: 'SUPER_ADMIN',
    });
    console.log(`[Cleanup] Created default admin: ${defaultAdminEmail}`);
  } else {
    // Ensure password is synchronized with .env
    admin.Password = await AdminUser.hashPassword(defaultAdminPassword);
    admin.Role = 'SUPER_ADMIN';
    await admin.save();
    console.log(`[Cleanup] Verified default super admin: ${defaultAdminEmail}`);
  }

  // 2. Remove all seeded demo records
  // Delete demo vendors and their associated locations, sessions, activity logs
  const deletedVendors = await Vendor.deleteMany({});
  const deletedLocations = await Location.deleteMany({});
  const deletedSessions = await Sessions.deleteMany({});
  const deletedBotSessions = await BotSession.deleteMany({});
  const deletedActivityLogs = await ActivityLog.deleteMany({});
  console.log(`[Cleanup] Deleted ${deletedVendors.deletedCount} vendors, ${deletedLocations.deletedCount} locations, ${deletedSessions.deletedCount} sessions, ${deletedBotSessions.deletedCount} bot sessions, ${deletedActivityLogs.deletedCount} activity logs.`);

  // 3. Delete demo residents and their preferences, alerts, ratings
  const deletedResidents = await Resident.deleteMany({});
  const deletedPreferences = await Preferences.deleteMany({});
  const deletedAlerts = await Alert.deleteMany({});
  const deletedAlertThrottles = await AlertThrottle.deleteMany({});
  const deletedRatings = await Ratings.deleteMany({});
  console.log(`[Cleanup] Deleted ${deletedResidents.deletedCount} residents, ${deletedPreferences.deletedCount} preferences, ${deletedAlerts.deletedCount} alerts, ${deletedAlertThrottles.deletedCount} alert throttles, ${deletedRatings.deletedCount} ratings.`);

  // 4. Verify categories are intact
  const Category = (await import('../models/Category.js')).default;
  const categoryCount = await Category.countDocuments();
  console.log(`[Cleanup] Category count preserved: ${categoryCount} trade categories.`);

  console.log('[Cleanup] Database is now completely free of mock and test data.');
  await mongoose.disconnect();
}

cleanup().catch((err) => {
  console.error('[Cleanup Error]', err);
  process.exit(1);
});
