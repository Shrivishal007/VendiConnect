import ActivityLog from '../models/ActivityLog.js';

export async function logActivity(vendorId, event, description = '') {
  try {
    return await ActivityLog.create({
      Vendor_ID: vendorId,
      Event: event,
      Description: description,
      EventTime: new Date(),
    });
  } catch (err) {
    console.error(`[activityLogService] Failed to log "${event}" for vendor ${vendorId}:`, err.message);
    return null;
  }
}

export async function getRecentActivity(vendorId, limit = 20) {
  return ActivityLog.find({ Vendor_ID: vendorId })
    .sort({ EventTime: -1 })
    .limit(limit)
    .lean();
}
