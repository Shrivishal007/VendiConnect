import ActivityLog from '../models/ActivityLog.js';

// Log vendor activity events for tracking and analytics
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

// Get recent activity logs for a specific vendor
export async function getRecentActivity(vendorId, limit = 20) {
  return ActivityLog.find({ Vendor_ID: vendorId })
    .sort({ EventTime: -1 })
    .limit(limit)
    .lean();
}

// Get paginated activity feed with optional filtering by vendor or event type
export async function getActivityFeed({ vendorId, event, skip = 0, limit = 20 } = {}) {
  const match = {};
  if (vendorId) match.Vendor_ID = vendorId;
  if (event) match.Event = event;

  const [items, total] = await Promise.all([
    ActivityLog.find(match)
      .populate({ path: 'Vendor_ID', select: 'Name' })
      .sort({ EventTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(match),
  ]);

  return { items, total };
}
