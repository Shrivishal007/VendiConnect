import Category from '../models/Category.js';

// Get all categories (public endpoint)
export async function getCategories(req, res) {
  try {
    const categories = await Category.find({}).sort({ Name: 1 }).lean();
    return res.status(200).json({ success: true, data: categories });
  } catch (err) {
    console.error('[categoryController.getCategories]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
