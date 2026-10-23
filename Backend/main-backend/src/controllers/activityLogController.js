import mongoose from 'mongoose';
import { getRecentActivity } from '../services/activityLogService.js';

// Retrieve recent activity logs for a specific vendor
export async function getVendorActivity(req, res) {
  try {
    const { vendorId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;

    // Validate the vendor ID format
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    // Restrict the requested number of activity records
    if (Number.isNaN(limit) || limit <= 0 || limit > 100) {
      return res
        .status(400)
        .json({ success: false, message: 'limit must be a number between 1 and 100' });
    }

    // Fetch the vendor's latest activity records
    const activity = await getRecentActivity(vendorId, limit);

    return res.status(200).json({ success: true, count: activity.length, data: activity });
  } catch (err) {
    // Log unexpected errors and return a generic response
    console.error('[activityLogController.getVendorActivity]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
