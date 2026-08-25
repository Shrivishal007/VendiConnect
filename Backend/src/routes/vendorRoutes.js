/**
 * routes/vendorRoutes.js
 * -----------------------------------------------------------------------
 * REST Gateway routes for everything vendor-facing.
 * *** MODIFIED: added GET /:vendorId/analytics/weekly (Week 4) ***
 * *** MODIFIED AGAIN - ER-diagram alignment pass:
 *     added session (consent) and activity-log routes ***
 * -----------------------------------------------------------------------
 */

import express from 'express';
import { updateVendorLocation } from '../controllers/locationController.js';
import { getNearbyVendors } from '../controllers/proximityController.js';
import { getWeeklyVendorAnalytics } from '../controllers/analyticsController.js';
import { updateConsent, getVendorSession } from '../controllers/vendorSessionController.js';
import { getVendorActivity } from '../controllers/activityLogController.js';

const router = express.Router();

// Called by the WhatsApp webhook layer after parsing a Live Location message.
router.post('/:vendorId/location', updateVendorLocation);

// Called by the React Native resident app's map screen.
router.get('/nearby', getNearbyVendors);

// Called by the WhatsApp messaging service to build a weekly digest.
router.get('/:vendorId/analytics/weekly', getWeeklyVendorAnalytics);

// NEW: called by the WhatsApp webhook layer once a vendor replies to a
// DPDPA consent opt-in/opt-out prompt.
router.post('/:vendorId/session/consent', updateConsent);

// NEW: read-only session/consent status check (admin dashboard, or the
// messaging service deciding whether to (re-)send a consent prompt).
router.get('/:vendorId/session', getVendorSession);

// NEW: admin dashboard "what has this vendor been doing" view.
router.get('/:vendorId/activity', getVendorActivity);

export default router;
