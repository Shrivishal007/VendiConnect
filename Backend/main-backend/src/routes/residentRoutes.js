import express from 'express';
import { requireFirebaseAuth, requireResidentAuth, requireOwnResident } from '../middleware/auth.js';
import {
  syncResident,
  getMyResidentProfile,
  updateMyResidentProfile,
  updateMyFcmToken,
} from '../controllers/residentAuthController.js';
import { setPreferences, getPreferences } from '../controllers/preferenceController.js';
import {
  getMyAlerts,
  markAlertRead,
  markAllAlertsRead,
} from '../controllers/residentAlertController.js';

const router = express.Router();

// Resident authentication and profile management
router.post('/auth/sync', requireFirebaseAuth, syncResident);
router.get('/auth/me', requireResidentAuth, getMyResidentProfile);
router.patch('/auth/me', requireResidentAuth, updateMyResidentProfile);
router.patch('/auth/fcm-token', requireResidentAuth, updateMyFcmToken);

// Resident in-app proximity alerts and notification center
router.get('/alerts', requireResidentAuth, getMyAlerts);
router.patch('/alerts/:alertId/read', requireResidentAuth, markAlertRead);
router.patch('/alerts/read-all', requireResidentAuth, markAllAlertsRead);

// Manage preferences with resident ownership verification
router.put('/:residentId/preferences', requireResidentAuth, requireOwnResident, setPreferences);
router.get('/:residentId/preferences', requireResidentAuth, requireOwnResident, getPreferences);

export default router;
