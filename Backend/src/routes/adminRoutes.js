import express from 'express';
import { adminLoginRateLimiter } from '../middleware/rateLimiter.js';
import { requireAdminAuth, requireRole } from '../middleware/auth.js';
import { login, register, getMe, getDashboard } from '../controllers/adminController.js';
import { getPilotReport } from '../controllers/pilotController.js';
import { listVendors, getVendorDetail, updateVendorStatus } from '../controllers/adminVendorController.js';
import { listResidents, getResidentDetail } from '../controllers/adminResidentController.js';
import { listCategoriesWithCounts, createCategory, updateCategory, deleteCategory } from '../controllers/adminCategoryController.js';
import { listRatings } from '../controllers/adminRatingController.js';
import { listAlerts } from '../controllers/adminAlertController.js';
import { listActivity } from '../controllers/adminActivityController.js';

const router = express.Router();

// Authentication and access control routes
router.post('/login', adminLoginRateLimiter, login);
router.get('/me', requireAdminAuth, getMe);
router.post('/register', adminLoginRateLimiter, requireAdminAuth, requireRole('SUPER_ADMIN'), register);

// Dashboard overview and pilot reports
router.get('/dashboard', requireAdminAuth, getDashboard);
router.get('/pilot-report', requireAdminAuth, getPilotReport);

// Vendor listing, details, and status management
router.get('/vendors', requireAdminAuth, listVendors);
router.get('/vendors/:vendorId', requireAdminAuth, getVendorDetail);
router.patch('/vendors/:vendorId/status', requireAdminAuth, requireRole('SUPER_ADMIN', 'OPERATIONS'), updateVendorStatus);

// Resident listing and details
router.get('/residents', requireAdminAuth, listResidents);
router.get('/residents/:residentId', requireAdminAuth, requireRole('SUPER_ADMIN', 'OPERATIONS'), getResidentDetail);

// Category listing and management
router.get('/categories', requireAdminAuth, listCategoriesWithCounts);
router.post('/categories', requireAdminAuth, requireRole('SUPER_ADMIN', 'OPERATIONS'), createCategory);
router.patch('/categories/:categoryId', requireAdminAuth, requireRole('SUPER_ADMIN', 'OPERATIONS'), updateCategory);
router.delete('/categories/:categoryId', requireAdminAuth, requireRole('SUPER_ADMIN'), deleteCategory);

// Ratings, alerts, and activity records
router.get('/ratings', requireAdminAuth, listRatings);
router.get('/alerts', requireAdminAuth, listAlerts);
router.get('/activity', requireAdminAuth, listActivity);

export default router;
