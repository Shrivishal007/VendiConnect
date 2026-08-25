/**
 * routes/ratingRoutes.js  *** NEW THIS WEEK ***
 * -----------------------------------------------------------------------
 */

import express from 'express';
import { createRating } from '../controllers/ratingController.js';

const router = express.Router();

// POST /api/ratings
router.post('/', createRating);

export default router;
