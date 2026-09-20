import express from 'express';
import { adminLoginRateLimiter } from '../middleware/rateLimiter.js';
import { requireAdminAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', adminLoginRateLimiter, login);
router.get('/me', requireAdminAuth, getMe);
router.post('/register', adminLoginRateLimiter, requireAdminAuth, requireRole('SUPER_ADMIN'), register);

router.get('/dashboard', requireAdminAuth, getDashboard);
router.get('pilot-report', requireAdminAuth, getPilotReport);

router.get('/vendors', requireAdminAuth, getVendorsList);
router.get('/vendors/:vendorId', requireAdminAuth, getVendorDetails);
router.patch('/vendors/:vendorId/status', requireAdminAuth, updateVendorStatus);

router.get('/residents', requireAdminAuth, getResidentsList);
router.get('/residents/:residentId', requireAdminAuth, getResidentDetails);

router.get('/categories', requireAdminAuth, getCategoriesList);
router.post('/categories', requireAdminAuth, requireRole('SUPER_ADMIN', 'OPERATIONS'), createCategory);
router.patch('/categories/:categoryId', requireAdminAuth, requireRole('SUPER_ADMIN', 'OPERATIONS'), updateCategory);
router.delete('/categories/:categoryId', requireAdminAuth, requireRole('SUPER_ADMIN'), deleteCategory);

router.get('/ratings', requireAdminAuth, getRatingsList);
router.get('/alerts', requireAdminAuth, getAlertsList);
router.get('/activity', requireAdminAuth, getActivityList);

export default router;