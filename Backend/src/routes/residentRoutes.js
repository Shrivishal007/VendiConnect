import express from 'express';
import { setPreferences, getPreferences } from '../controllers/residentPreferenceController.js';

const router = express.Router();

router.put('/:residentId/preferences', setPreferences);

router.get('/:residentId/preferences', getPreferences);

export default router;
