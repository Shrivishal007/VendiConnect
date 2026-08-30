import mongoose from 'mongoose';
import Rating from '../models/Rating.js';
import Vendor from '../models/Vendor.js';

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

  const avgRating = result ? Math.round(result.avgRating * 10) / 10 : 0;
  const ratingCount = result ? result.ratingCount : 0;

  await Vendor.updateOne(
    { _id: vendorObjectId },
    { $set: { AvgRating: avgRating, RatingCount: ratingCount } }
  );

  return { avgRating, ratingCount };
}
