import mongoose from 'mongoose';
import Ratings from '../models/Ratings.js';
import Vendor from '../models/Vendor.js';

// Recalculate and update a vendor's average rating and total rating count
export async function recalculateAvgRating(vendorId) {
  const vendorObjectId =
    typeof vendorId === 'string' ? new mongoose.Types.ObjectId(vendorId) : vendorId;

  // Aggregate all ratings for the specified vendor
  const [result] = await Ratings.aggregate([
    { $match: { Vendor_ID: vendorObjectId } },
    {
      $group: {
        _id: '$Vendor_ID',
        avgRating: { $avg: '$Rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  // Round the average to one decimal place and handle vendors without ratings
  const avgRating = result ? Math.round(result.avgRating * 10) / 10 : 0;
  const ratingCount = result ? result.ratingCount : 0;

  // Save the recalculated statistics to the vendor record
  await Vendor.updateOne(
    { _id: vendorObjectId },
    { $set: { AvgRating: avgRating, RatingCount: ratingCount } }
  );

  return { avgRating, ratingCount };
}
