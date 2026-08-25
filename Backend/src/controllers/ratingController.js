/**
 * controllers/ratingController.js  *** NEW THIS WEEK ***
 * -----------------------------------------------------------------------
 * POST /api/ratings - resident submits (or updates) a rating for a
 * vendor. After the write succeeds, triggers ratingService's
 * aggregation pipeline to keep Vendor.AvgRating/RatingCount in sync.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import Rating from '../models/Rating.js';
import Vendor from '../models/Vendor.js';
import { recalculateAvgRating } from '../services/ratingService.js';
import { logActivity } from '../services/activityLogService.js';

/**
 * POST /api/ratings
 * Body: { vendorId, residentId, ratingValue, review? }
 *
 * Uses an upsert on the unique (Vendor_ID, Resident_ID) compound index -
 * a resident re-rating the same vendor updates their existing rating
 * rather than creating a duplicate, which keeps the aggregation
 * pipeline's average correct without needing extra dedupe logic there.
 */
export async function createRating(req, res) {
  try {
    const { vendorId, residentId, ratingValue, review } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(vendorId) ||
      !mongoose.Types.ObjectId.isValid(residentId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Valid vendorId and residentId are required' });
    }

    if (typeof ratingValue !== 'number' || ratingValue < 1 || ratingValue > 5) {
      return res
        .status(400)
        .json({ success: false, message: 'ratingValue must be a number between 1 and 5' });
    }

    const vendorExists = await Vendor.exists({ _id: vendorId });
    if (!vendorExists) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const rating = await Rating.findOneAndUpdate(
      { Vendor_ID: vendorId, Resident_ID: residentId },
      {
        Vendor_ID: vendorId,
        Resident_ID: residentId,
        RatingValue: ratingValue,
        Review: review || '',
        RatingDate: new Date(),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    // "Database trigger" step: recompute AvgRating/RatingCount from the
    // full Rating set for this vendor via the aggregation pipeline.
    const { avgRating, ratingCount } = await recalculateAvgRating(vendorId);

    // Fire-and-forget audit trail entry - matches ActivityLog's ER-diagram
    // role as an append-only log, never blocks the response.
    logActivity(vendorId, 'Rating Received', `${ratingValue}-star rating recorded (vendor avg now ${avgRating})`);

    return res.status(201).json({
      success: true,
      message: 'Rating recorded',
      data: {
        rating,
        vendorAvgRating: avgRating,
        vendorRatingCount: ratingCount,
      },
    });
  } catch (err) {
    // Duplicate-key races (two near-simultaneous submits for the same
    // pair) fall through to findOneAndUpdate's upsert semantics in the
    // vast majority of cases, but a driver-level E11000 can still slip
    // through under heavy concurrency - surface it as a 409 rather than
    // a generic 500.
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: 'Rating for this vendor/resident pair already exists' });
    }

    console.error('[ratingController.createRating]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
