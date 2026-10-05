import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Preferences from '../models/Preferences.js';

const MAX_PREFERENCES = 100;
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// Strict check: mongoose's isValid also accepts numbers and any 12-character string
function isObjectIdString(value) {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}

// Set or update resident category preferences (requireOwnResident guarantees :residentId is the signed-in resident)
export async function setPreferences(req, res) {
  try {
    const residentId = req.resident._id;
    const { categoryIds } = req.body || {};

    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ success: false, message: 'categoryIds must be an array' });
    }

    if (categoryIds.length > MAX_PREFERENCES) {
      return res.status(400).json({ success: false, message: `categoryIds cannot contain more than ${MAX_PREFERENCES} items` });
    }

    const invalidIds = categoryIds.filter((id) => !isObjectIdString(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid category id(s): ${invalidIds.map(String).join(', ')}`,
      });
    }

    const normalizedIds = categoryIds.map((id) => id.toLowerCase());
    if (new Set(normalizedIds).size !== normalizedIds.length) {
      return res.status(400).json({ success: false, message: 'categoryIds must not contain duplicates' });
    }

    const foundCategories = await Category.find({ _id: { $in: normalizedIds } })
      .select('_id')
      .lean();

    if (foundCategories.length !== normalizedIds.length) {
      const foundIds = new Set(foundCategories.map((c) => String(c._id)));
      const missing = normalizedIds.filter((id) => !foundIds.has(id));
      return res
        .status(404)
        .json({ success: false, message: `Category id(s) not found: ${missing.join(', ')}` });
    }

    await Preferences.deleteMany({
      Resident_ID: residentId,
      Category_ID: { $nin: normalizedIds },
    });

    await Promise.all(
      normalizedIds.map((categoryId) =>
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
      data: { Resident_ID: residentId, categoryIds: normalizedIds },
    });
  } catch (err) {
    console.error('[preferenceController.setPreferences]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Get resident category preferences
export async function getPreferences(req, res) {
  try {
    const residentId = req.resident._id;

    const preferences = await Preferences.find({ Resident_ID: residentId })
      .populate({ path: 'Category_ID', select: 'Name Icon' })
      .lean();

    // A category deleted after the preference was saved populates as null - skip it
    const categories = preferences.map((pref) => pref.Category_ID).filter(Boolean);

    return res.status(200).json({ success: true, data: categories });
  } catch (err) {
    console.error('[preferenceController.getPreferences]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
