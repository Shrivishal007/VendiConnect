import express from 'express';
import { getCategories } from '../controllers/categoryController.js';

const router = express.Router();

// Public endpoint for retrieving all categories
router.get('/categories', getCategories);

export default router;
