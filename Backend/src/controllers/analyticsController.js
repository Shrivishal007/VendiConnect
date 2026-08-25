/**
 * controllers/analyticsController.js  *** NEW THIS WEEK ***
 * -----------------------------------------------------------------------
 * Thin REST wrapper around services/analyticsService.js, so your
 * teammate's WhatsApp messaging service (or the admin dashboard) can
 * pull a vendor's weekly summary over HTTP instead of importing the
 * service module directly.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import { generateWeeklyVendorSummary } from '../services/analyticsService.js';

/**
 * GET /api/vendors/:vendorId/analytics/weekly
 */
export async function getWeeklyVendorAnalytics(req, res) {
  try {
    const { vendorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    const summary = await generateWeeklyVendorSummary(vendorId);

    if (!summary) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    console.error('[analyticsController.getWeeklyVendorAnalytics]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
