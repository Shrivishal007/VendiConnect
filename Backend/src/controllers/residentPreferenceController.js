import mongoose from 'mongoose';
import Resident from '../models/Resident.js';
import Category from '../models/Category.js';
import ResidentCategoryPreference from '../models/ResidentCategoryPreference.js';

export async function setPreferences(req, res) {
  try {
    const { residentId } = req.params;
    const { categoryIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(residentId)) {
      return res.status(400).json({ success: false, message: 'Invalid residentId' });
    }

    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ success: false, message: 'categoryIds must be an array' });
    }

    const invalidIds = categoryIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid category id(s): ${invalidIds.join(', ')}`,
      });
    }

    const residentExists = await Resident.exists({ _id: residentId });
    if (!residentExists) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

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

    await ResidentCategoryPreference.deleteMany({
      Resident_ID: residentId,
      Category_ID: { $nin: categoryIds },
    });

    await Promise.all(
      categoryIds.map((categoryId) =>
        ResidentCategoryPreference.findOneAndUpdate(
          { Resident_ID: residentId, Category_ID: categoryId },
          { Resident_ID: residentId, Category_ID: categoryId },
          { upsert: true, setDefaultsOnInsert: true }
        )
      )
    );

    return res.status(200).json({
      success: true,
      message: 'Preferences updated',
      data: { Resident_ID: residentId, categoryIds },
    });
  } catch (err) {
    console.error('[residentPreferenceController.setPreferences]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getPreferences(req, res) {
  try {
    const { residentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(residentId)) {
      return res.status(400).json({ success: false, message: 'Invalid residentId' });
    }

    const preferences = await ResidentCategoryPreference.find({ Resident_ID: residentId })
      .populate({ path: 'Category_ID', select: 'Name IconKey' })
      .lean();

    const categories = preferences.map((pref) => pref.Category_ID);

    return res.status(200).json({ success: true, data: categories });
  } catch (err) {
    console.error('[residentPreferenceController.getPreferences]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
