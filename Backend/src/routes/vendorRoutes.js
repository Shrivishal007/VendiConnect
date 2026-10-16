/**
 * routes/vendorRoutes.js
 * -----------------------------------------------------------------------
 * REST Gateway routes for vendor operations & resident interactions.
 * -----------------------------------------------------------------------
 */

import express from 'express';
const router = express.Router();

import updateVendorLocation from '../controllers/locationController.js';
import getNearbyVendors from '../controllers/proximityController.js';
import { 
  registerVendor, 
  getAllVendors, 
  updateVendorStatus,
  rateVendor,
  getActiveVendorsSummary 
} from '../controllers/vendorController.js';

// POST /api/vendors/:vendorId/location
router.post('/:vendorId/location', updateVendorLocation);

// GET /api/vendors/nearby?lat=..&lng=..&radius=..
router.get('/nearby', getNearbyVendors);

// GET /api/vendors/active-summary
router.get('/active-summary', getActiveVendorsSummary);

// POST /api/vendors/register
router.post('/register', registerVendor);

// PATCH /api/vendors/:vendorId/status
router.patch('/:vendorId/status', updateVendorStatus);

// POST /api/vendors/:vendorId/rate - Submit resident review
router.post('/:vendorId/rate', rateVendor);

// GET /api/vendors - List all vendors
router.get('/', getAllVendors);

export default router;
