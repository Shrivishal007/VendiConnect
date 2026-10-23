import Category from '../models/Category.js';

// Retrieve all categories for public access
export async function getCategories(req, res) {
  try {
    // Fetch categories alphabetically by name
    const categories = await Category.find({}).sort({ Name: 1 }).lean();
    return res.status(200).json({ success: true, data: categories });
  } catch (err) {
    // Log unexpected errors and return a generic response
    console.error('[categoryController.getCategories]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
