import express from 'express';
import { setPreferences, getPreferences } from '../controllers/preferenceController.js';

const router = express.Router();

// Note: requireResidentAuth, attachResident, requireOwnResident middleware need to be implemented
// Note: syncResident, getMyResidentProfile, updateMyResidentProfile, updateMyFcmToken controllers need to be implemented

router.post('/auth/sync', (req, res) => {
  res.status(501).json({ success: false, message: 'Resident sync requires controller implementation' });
});
router.get('/auth/me', (req, res) => {
  res.status(501).json({ success: false, message: 'Resident profile requires controller implementation' });
});
router.patch('/auth/me', (req, res) => {
  res.status(501).json({ success: false, message: 'Resident profile update requires controller implementation' });
});
router.patch('/auth/fcm-token', (req, res) => {
  res.status(501).json({ success: false, message: 'FCM token update requires controller implementation' });
});

router.put('/:residentId/preferences', setPreferences);
router.get('/:residentId/preferences', getPreferences);

export default router;