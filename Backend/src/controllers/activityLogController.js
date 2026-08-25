/**
 * controllers/activityLogController.js  *** NEW ***
 * -----------------------------------------------------------------------
 * Read-only endpoint over ActivityLog, mainly for the admin dashboard
 * ("show me what this vendor has been doing") and debugging. Writes to
 * ActivityLog happen via services/activityLogService.logActivity() calls
 * sprinkled into the controllers that perform the actual actions - see
 * locationController.js and ratingController.js.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import { getRecentActivity } from '../services/activityLogService.js';

/**
 * GET /api/vendors/:vendorId/activity?limit=20
 */
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
