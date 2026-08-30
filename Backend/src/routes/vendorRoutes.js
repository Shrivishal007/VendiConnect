import express from 'express';
import { updateVendorLocation } from '../controllers/locationController.js';
import { getNearbyVendors } from '../controllers/proximityController.js';
import { getActiveVendorsSummary } from '../controllers/vendorController.js';
import { getWeeklyVendorAnalytics, getVendorAnalytics } from '../controllers/analyticsController.js';
import { updateConsent, revokeConsent, getVendorSession } from '../controllers/vendorSessionController.js';
import { getVendorActivity } from '../controllers/activityLogController.js';
import { validateCoordinates } from '../middleware/validateCoordinates.js';
import { locationIngestLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/:vendorId/location', locationIngestLimiter, validateCoordinates, updateVendorLocation);

router.get('/nearby', getNearbyVendors);

router.get('/active-summary', getActiveVendorsSummary);

router.get('/:vendorId/analytics', getVendorAnalytics);

router.get('/:vendorId/analytics/weekly', getWeeklyVendorAnalytics);

router.post('/:vendorId/session/consent', updateConsent);

router.post('/:vendorId/session/withdraw', revokeConsent);

router.get('/:vendorId/session', getVendorSession);

router.get('/:vendorId/activity', getVendorActivity);

export default router;
