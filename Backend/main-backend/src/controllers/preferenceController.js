import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Preferences from '../models/Preferences.js';

const MAX_PREFERENCES = 10;

// Set or update preferences for the authenticated resident
export async function setPreferences(req, res) {
  try {
    const residentId = req.resident._id;
    const { categoryIds } = req.body || {};

    // Ensure categoryIds is an array
    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ success: false, message: 'categoryIds must be an array' });
    }

    // Limit the number of preferences per resident
    if (categoryIds.length > MAX_PREFERENCES) {
      return res.status(400).json({ success: false, message: `categoryIds cannot contain more than ${MAX_PREFERENCES} items` });
    }

    // Validate MongoDB ObjectIds
    if (!categoryIds.every((id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category IDs',
      });
    }

    // Prevent duplicate category selections
    if (new Set(categoryIds).size !== categoryIds.length) {
      return res.status(400).json({ success: false, message: 'categoryIds must not contain duplicates' });
    }

    // Verify that all requested categories exist
    const foundCategories = await Category.find({ _id: { $in: categoryIds } })
      .select('_id')
      .lean();

    if (foundCategories.length !== categoryIds.length) {
      const foundIds = new Set(foundCategories.map((c) => String(c._id)));
      const missing = categoryIds.filter((id) => !foundIds.has(id));
      return res
        .status(404)
        .json({ success: false, message: `Category id(s) not found: ${missing.join(', ')}` });
    }

    // Remove preferences that are no longer selected
    await Preferences.deleteMany({
      Resident_ID: residentId,
      Category_ID: { $nin: categoryIds },
    });

    // Insert new preferences or retain existing ones
    await Promise.all(
      categoryIds.map((categoryId) =>
        Preferences.findOneAndUpdate(
          { Resident_ID: residentId, Category_ID: categoryId },
          { Resident_ID: residentId, Category_ID: categoryId },
          { upsert: true, setDefaultsOnInsert: true }
        )
      )
    );

    return res.status(200).json({
      success: true,
      message: 'Preferences updated',
      data: { Resident_ID: residentId, categoryIds: categoryIds },
    });
  } catch (err) {
    // Log unexpected errors and return a generic response
    console.error('[preferenceController.setPreferences]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Retrieve category preferences for the authenticated resident
export async function getPreferences(req, res) {
  try {
    const residentId = req.resident._id;

    // Populate preferences with category names and icons
    const preferences = await Preferences.find({ Resident_ID: residentId })
      .populate({ path: 'Category_ID', select: 'Name Icon' })
      .lean();

    // Skip preferences whose referenced categories have been deleted
    const categories = preferences.map((pref) => pref.Category_ID).filter(Boolean);

    return res.status(200).json({ success: true, data: categories });
  } catch (err) {
    // Log unexpected errors and return a generic response
    console.error('[preferenceController.getPreferences]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
