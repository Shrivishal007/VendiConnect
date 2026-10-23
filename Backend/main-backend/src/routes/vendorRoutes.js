import express from 'express';
import { locationIngestLimiter, publicRateLimiter } from '../middleware/rateLimiter.js';
import { requireAdminAuth, requireResidentAuth } from '../middleware/auth.js';
import { updateVendorLocation } from '../controllers/locationController.js';
import { getNearbyVendors, getNearbyVendorsForResident } from '../controllers/proximityController.js';
import { getActiveVendorsSummary } from '../controllers/vendorController.js';
import { getVendorAnalytics, getWeeklyVendorAnalytics } from '../controllers/analyticsController.js';
import { updateConsent, revokeConsent, getVendorSession } from '../controllers/vendorSessionController.js';
import { getVendorActivity } from '../controllers/activityLogController.js';
import { handleBotMessage, handleResetBotSession } from '../controllers/botController.js';

const router = express.Router();

// WhatsApp bot interaction endpoints
router.post('/bot/message', handleBotMessage);
router.post('/bot/reset', handleResetBotSession);

// Vendor location updates and session consent management
router.post('/:vendorId/location', locationIngestLimiter, updateVendorLocation);
router.post('/:vendorId/session/consent', updateConsent);
router.post('/:vendorId/session/withdraw', revokeConsent);

// Find nearby vendors using coordinates or the authenticated resident's location
router.get('/nearby', publicRateLimiter, getNearbyVendors);
router.get('/nearby/me', requireResidentAuth, getNearbyVendorsForResident);

// Public summary of currently active vendors
router.get('/active-vendors', publicRateLimiter, getActiveVendorsSummary);

// Admin-only vendor analytics, session details, and activity logs
router.get('/:vendorId/analytics', requireAdminAuth, getVendorAnalytics);
router.get('/:vendorId/analytics/weekly', requireAdminAuth, getWeeklyVendorAnalytics);
router.get('/:vendorId/session', requireAdminAuth, getVendorSession);
router.get('/:vendorId/activity', requireAdminAuth, getVendorActivity);

export default router;
