import express from 'express';
import { locationIngestLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/:vendorId/location', locationIngestLimiter, updateVendorLocation);
router.get('/nearby', getNearbyVendors);

router.get('/active-vendors', getVendorsSummary);
router.get('/:vendorId/analytics', getVendorAnalytics);
router.get('/:vendorId/analytics/weekly', getWeeklyVendorAnalytics);

router.post('/:vendorId/session/consent', updateConsent);
router.post('/:vendorId/session/withdraw', revokeConsent);
router.get('/:vendorId/session', getVendorSession);

router.get('/:vendorId/activity', getVendorActivity);

export default router;