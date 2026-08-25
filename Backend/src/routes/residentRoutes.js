/**
 * routes/residentRoutes.js  *** NEW - ER-diagram alignment pass ***
 * -----------------------------------------------------------------------
 * Resident-facing routes. Currently just category preferences
 * (ResidentCategoryPreference), which backs the category half of
 * slide 12's "Category and Rating-based filtering" deliverable.
 * -----------------------------------------------------------------------
 */

import express from 'express';
import { setPreferences, getPreferences } from '../controllers/residentPreferenceController.js';

const router = express.Router();

// PUT (not POST) - body is the resident's full desired preference set,
// replacing whatever was there before. See controller comment for why.
router.put('/:residentId/preferences', setPreferences);

router.get('/:residentId/preferences', getPreferences);

export default router;
