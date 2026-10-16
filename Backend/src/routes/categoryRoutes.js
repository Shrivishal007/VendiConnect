/**
 * routes/categoryRoutes.js
 * -----------------------------------------------------------------------
 * Exposes category lookup for the vendor registration form dropdown.
 * -----------------------------------------------------------------------
 */
import express from 'express';
import Category from '../models/Category.js';
const router = express.Router();
// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({}).lean();
    return res.status(200).json({ success: true, data: categories });
  } catch (err) {
    console.error('[categoryRoutes]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});
export default router;
