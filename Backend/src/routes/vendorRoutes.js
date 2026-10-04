import express from 'express';
import { locationIngestLimiter } from '../middleware/rateLimiter.js';
import { updateVendorLocation } from '../controllers/locationController.js';
import { getNearbyVendors } from '../controllers/proximityController.js';
import { getActiveVendorsSummary } from '../controllers/vendorController.js';
import { getVendorAnalytics, getWeeklyVendorAnalytics } from '../controllers/analyticsController.js';
import { updateConsent, revokeConsent, getVendorSession } from '../controllers/vendorSessionController.js';
import { getVendorActivity } from '../controllers/activityLogController.js';

const router = express.Router();

// Location tracking
router.post('/:vendorId/location', locationIngestLimiter, updateVendorLocation);
router.get('/nearby', getNearbyVendors);

// Vendor analytics
router.get('/active-vendors', getActiveVendorsSummary);
router.get('/:vendorId/analytics', getVendorAnalytics);
router.get('/:vendorId/analytics/weekly', getWeeklyVendorAnalytics);

// Session & consent management
router.post('/:vendorId/session/consent', updateConsent);
router.post('/:vendorId/session/withdraw', revokeConsent);
router.get('/:vendorId/session', getVendorSession);

// Activity logs
router.get('/:vendorId/activity', getVendorActivity);

export default router;