import mongoose from 'mongoose';
import { generateVendorAnalytics, generateWeeklyVendorSummary } from '../services/analyticsService.js';

// Retrieve the weekly analytics summary for a vendor
export async function getWeeklyVendorAnalytics(req, res) {
  try {
    const { vendorId } = req.params;

    // Validate the vendor ID format
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    const summary = await generateWeeklyVendorSummary(vendorId);

    // Return 404 if the vendor does not exist
    if (!summary) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    // Log unexpected errors and return a generic response
    console.error('[analyticsController.getWeeklyVendorAnalytics]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Retrieve vendor analytics for a configurable time window
export async function getVendorAnalytics(req, res) {
  try {
    const { vendorId } = req.params;
    const windowDays = req.query.windowDays ? parseInt(req.query.windowDays, 10) : 7;

    // Validate the vendor ID format
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    // Ensure the requested analytics window is positive
    if (!Number.isFinite(windowDays) || windowDays <= 0) {
      return res.status(400).json({ success: false, message: 'windowDays must be a positive number' });
    }

    const analytics = await generateVendorAnalytics(vendorId, windowDays);

    // Return 404 if the vendor does not exist
    if (!analytics) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    return res.status(200).json({ success: true, data: analytics });
  } catch (err) {
    // Log unexpected errors and return a generic response
    console.error('[analyticsController.getVendorAnalytics]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
