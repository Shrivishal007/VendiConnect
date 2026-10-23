import express from 'express';
import { requireResidentAuth, attachResident, requireOwnResident } from '../middleware/auth.js';
import { syncResident, getMyResidentProfile, updateMyResidentProfile, updateMyFcmToken } from '../controllers/residentAuthController.js';
import { setPreferences, getPreferences } from '../controllers/preferenceController.js';

const router = express.Router();

// Resident authentication and profile management
router.post('/auth/sync', requireResidentAuth, syncResident);
router.get('/auth/me', requireResidentAuth, getMyResidentProfile);
router.patch('/auth/me', requireResidentAuth, updateMyResidentProfile);
router.patch('/auth/fcm-token', requireResidentAuth, updateMyFcmToken);

// Manage preferences with resident ownership verification
router.put('/:residentId/preferences', requireResidentAuth, attachResident, requireOwnResident, setPreferences);
router.get('/:residentId/preferences', requireResidentAuth, attachResident, requireOwnResident, getPreferences);

export default router;
