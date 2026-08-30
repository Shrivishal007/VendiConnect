import mongoose from 'mongoose';
import { generateWeeklyVendorSummary, generateVendorAnalytics } from '../services/analyticsService.js';

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

export async function getVendorAnalytics(req, res) {
  try {
    const { vendorId } = req.params;
    const windowDays = req.query.windowDays ? parseInt(req.query.windowDays, 10) : 7;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    if (!Number.isFinite(windowDays) || windowDays <= 0) {
      return res.status(400).json({ success: false, message: 'windowDays must be a positive number' });
    }

    const analytics = await generateVendorAnalytics(vendorId, windowDays);

    if (!analytics) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    return res.status(200).json({ success: true, data: analytics });
  } catch (err) {
    console.error('[analyticsController.getVendorAnalytics]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
