import mongoose from 'mongoose';
import { getRecentActivity } from '../services/activityLogService.js';

export async function getVendorActivity(req, res) {
  try {
    const { vendorId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    if (Number.isNaN(limit) || limit <= 0 || limit > 100) {
      return res
        .status(400)
        .json({ success: false, message: 'limit must be a number between 1 and 100' });
    }

    const activity = await getRecentActivity(vendorId, limit);

    return res.status(200).json({ success: true, count: activity.length, data: activity });
  } catch (err) {
    console.error('[activityLogController.getVendorActivity]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
