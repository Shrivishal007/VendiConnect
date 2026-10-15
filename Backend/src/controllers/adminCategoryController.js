import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Vendor from '../models/Vendor.js';

const TEXT_MAX_LENGTH = 100;

// List categories with vendor counts
export async function listCategoriesWithCounts(req, res) {
  try {
    const categories = await Category.find({}).sort({ Name: 1 }).lean();
    const counts = await Vendor.aggregate([{ $group: { _id: '$Category_ID', count: { $sum: 1 } } }]);
    const countByCategory = new Map(counts.map((c) => [String(c._id), c.count]));

    const data = categories.map((category) => ({
      ...category,
      vendorCount: countByCategory.get(String(category._id)) || 0,
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[adminCategoryController.listCategoriesWithCounts]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Create a new category
export async function createCategory(req, res) {
  try {
    const { name, iconKey } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    if (name.trim().length > TEXT_MAX_LENGTH) {
      return res.status(400).json({ success: false, message: `name must be at most ${TEXT_MAX_LENGTH} characters` });
    }
    if (iconKey !== undefined && typeof iconKey !== 'string') {
      return res.status(400).json({ success: false, message: 'iconKey must be a string' });
    }
    if (iconKey && iconKey.trim().length > TEXT_MAX_LENGTH) {
      return res.status(400).json({ success: false, message: `iconKey must be at most ${TEXT_MAX_LENGTH} characters` });
    }

    const category = await Category.create({ Name: name.trim(), Icon: iconKey ? iconKey.trim() : '' });
    return res.status(201).json({ success: true, data: category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists' });
    }
    console.error('[adminCategoryController.createCategory]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Update an existing category
export async function updateCategory(req, res) {
  try {
    const { categoryId } = req.params;
    const { name, iconKey } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: 'Invalid categoryId' });
    }

    const update = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'name must be a non-empty string' });
      }
      if (name.trim().length > TEXT_MAX_LENGTH) {
        return res.status(400).json({ success: false, message: `name must be at most ${TEXT_MAX_LENGTH} characters` });
      }
      update.Name = name.trim();
    }
    if (iconKey !== undefined) {
      if (typeof iconKey !== 'string') {
        return res.status(400).json({ success: false, message: 'iconKey must be a string' });
      }
      if (iconKey.trim().length > TEXT_MAX_LENGTH) {
        return res.status(400).json({ success: false, message: `iconKey must be at most ${TEXT_MAX_LENGTH} characters` });
      }
      update.Icon = iconKey.trim();
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    }

    const category = await Category.findByIdAndUpdate(categoryId, { $set: update }, { returnDocument: 'after', runValidators: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    return res.status(200).json({ success: true, data: category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists' });
    }
    console.error('[adminCategoryController.updateCategory]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Delete a category (only if no vendors assigned)
export async function deleteCategory(req, res) {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: 'Invalid categoryId' });
    }

    const vendorsInCategory = await Vendor.countDocuments({ Category_ID: categoryId });
    if (vendorsInCategory > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete: ${vendorsInCategory} vendor(s) are still assigned to this category. Reassign or remove them first.`,
      });
    }

    const category = await Category.findByIdAndDelete(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    return res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (err) {
    console.error('[adminCategoryController.deleteCategory]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
