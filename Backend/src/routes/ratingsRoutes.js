import express from 'express';
import { requireResidentAuth, attachResident } from '../middleware/auth.js';
import { createRating } from '../controllers/ratingController.js';

const router = express.Router();

router.post('/', requireResidentAuth, attachResident, createRating);

export default router;
