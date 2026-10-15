import mongoose from 'mongoose';
import { getActivityFeed } from '../services/activityLogService.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';

// List activity logs for admin with pagination
export async function listActivity(req, res) {
  try {
    const { vendorId, event } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    if (vendorId && !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    const { items, total } = await getActivityFeed({ vendorId, event, skip, limit });

    const data = items.map((entry) => ({
      Log_ID: entry._id,
      VendorName: entry.Vendor_ID?.Name || 'Unknown vendor',
      Vendor_ID: entry.Vendor_ID?._id || null,
      Event: entry.Event,
      Description: entry.Description,
      EventTime: entry.EventTime,
    }));

    return res.status(200).json({ success: true, data, meta: buildPageMeta({ page, limit, total }) });
  } catch (err) {
    console.error('[adminActivityController.listActivity]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
