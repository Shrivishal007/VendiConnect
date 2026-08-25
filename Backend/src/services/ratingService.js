/**
 * services/ratingService.js  *** NEW THIS WEEK ***
 * -----------------------------------------------------------------------
 * "Database trigger" behavior for Week 4: whenever a Rating is written,
 * recalculateAvgRating() re-derives Vendor.AvgRating and RatingCount
 * from the full set of Rating documents for that vendor via a Mongoose
 * aggregation pipeline.
 *
 * This is called explicitly from controllers/ratingController.js right
 * after a successful Rating upsert - Mongoose/MongoDB don't have native
 * "ON INSERT" triggers like a SQL database, so the application layer is
 * the trigger. (A MongoDB Atlas Trigger configured in the Atlas UI could
 * do this server-side instead, but that would live outside this
 * codebase and outside your git history - keeping it here keeps the
 * business logic reviewable and testable like everything else.)
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import Rating from '../models/Rating.js';
import Vendor from '../models/Vendor.js';

/**
 * Recomputes AvgRating/RatingCount for one vendor from scratch using an
 * aggregation pipeline, then writes the result back onto the Vendor doc.
 *
 * Aggregation-over-incremental-average is used deliberately: it's
 * self-healing (immune to drift from any missed update, manual DB edit,
 * or a rating being deleted later) at the cost of an O(n) scan over that
 * vendor's ratings on every write. For a street-vendor rating volume
 * (dozens-hundreds per vendor, not millions), that cost is negligible
 * and the correctness guarantee is worth it.
 *
 * @param {string|mongoose.Types.ObjectId} vendorId
 * @returns {Promise<{ avgRating: number, ratingCount: number }>}
 */
export async function recalculateAvgRating(vendorId) {
  const vendorObjectId =
    typeof vendorId === 'string' ? new mongoose.Types.ObjectId(vendorId) : vendorId;

  const [result] = await Rating.aggregate([
    { $match: { Vendor_ID: vendorObjectId } },
    {
      $group: {
        _id: '$Vendor_ID',
        avgRating: { $avg: '$RatingValue' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  // No ratings at all (e.g. the vendor's only rating was just deleted) -
  // reset to a clean zero state rather than leaving a stale average.
  const avgRating = result ? Math.round(result.avgRating * 10) / 10 : 0; // 1 decimal place
  const ratingCount = result ? result.ratingCount : 0;

  await Vendor.updateOne(
    { _id: vendorObjectId },
    { $set: { AvgRating: avgRating, RatingCount: ratingCount } }
  );

  return { avgRating, ratingCount };
}
