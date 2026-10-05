import express from 'express';
import { locationIngestLimiter, publicRateLimiter } from '../middleware/rateLimiter.js';
import { requireAdminAuth, requireResidentAuth, attachResident } from '../middleware/auth.js';
import { updateVendorLocation } from '../controllers/locationController.js';
import { getNearbyVendors, getNearbyVendorsForResident } from '../controllers/proximityController.js';
import { getActiveVendorsSummary } from '../controllers/vendorController.js';
import { getVendorAnalytics, getWeeklyVendorAnalytics } from '../controllers/analyticsController.js';
import { updateConsent, revokeConsent, getVendorSession } from '../controllers/vendorSessionController.js';
import { getVendorActivity } from '../controllers/activityLogController.js';

const router = express.Router();

router.post('/:vendorId/location', locationIngestLimiter, updateVendorLocation);
router.post('/:vendorId/session/consent', updateConsent);
router.post('/:vendorId/session/withdraw', revokeConsent);

// Nearby search: public by coordinates, or by the signed-in resident's stored location
router.get('/nearby', publicRateLimiter, getNearbyVendors);
router.get('/nearby/me', requireResidentAuth, attachResident, getNearbyVendorsForResident);

// Public live summary
router.get('/active-vendors', publicRateLimiter, getActiveVendorsSummary);

// Vendor analytics, session and activity data (admin only)
router.get('/:vendorId/analytics', requireAdminAuth, getVendorAnalytics);
router.get('/:vendorId/analytics/weekly', requireAdminAuth, getWeeklyVendorAnalytics);
router.get('/:vendorId/session', requireAdminAuth, getVendorSession);
router.get('/:vendorId/activity', requireAdminAuth, getVendorActivity);

export default router;
