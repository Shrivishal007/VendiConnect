/**
 * controllers/residentPreferenceController.js  *** NEW ***
 * -----------------------------------------------------------------------
 * Manages a resident's preferred vendor categories - backs the
 * ResidentCategoryPreference join collection and the "Category and
 * Rating-based filtering" deliverable from slide 12.
 *
 * PUT (not POST) semantics are used for setting preferences: the
 * request body is the resident's COMPLETE desired preference set, and
 * this replaces whatever was there before. This matches how a
 * multi-select category picker in the React app would naturally work
 * (checkbox list -> submit the full selection) far better than
 * incremental add/remove-one-at-a-time calls would.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import Resident from '../models/Resident.js';
import Category from '../models/Category.js';
import ResidentCategoryPreference from '../models/ResidentCategoryPreference.js';

/**
 * PUT /api/residents/:residentId/preferences
 * Body: { categoryIds: string[] }
 *
 * Replaces the resident's full set of preferred categories. Implemented
 * as delete-outside-the-set + upsert-inside-the-set rather than a
 * blind delete-all-then-insert-all, so a partial failure mid-request
 * can't leave a resident with zero preferences when they actually still
 * had some - the diff is computed first, then applied.
 */
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

    // Confirm every requested category actually exists, in one query
    // rather than one lookup per id.
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

    // Remove preferences no longer in the requested set.
    await ResidentCategoryPreference.deleteMany({
      Resident_ID: residentId,
      Category_ID: { $nin: categoryIds },
    });

    // Upsert each requested preference - idempotent if it already exists.
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

/**
 * GET /api/residents/:residentId/preferences
 */
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
