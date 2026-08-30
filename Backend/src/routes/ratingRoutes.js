import express from 'express';
import { createRating } from '../controllers/ratingController.js';

const router = express.Router();

router.post('/', createRating);

export default router;
