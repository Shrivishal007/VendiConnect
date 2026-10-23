import express from 'express';
import { requireResidentAuth, attachResident } from '../middleware/auth.js';
import { createRating } from '../controllers/ratingController.js';

const router = express.Router();

// Authenticate the resident and attach their profile before submitting a rating
router.post('/', requireResidentAuth, attachResident, createRating);

export default router;
