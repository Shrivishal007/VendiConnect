import mongoose from 'mongoose';
import Ratings from '../models/Ratings.js';
import Vendor from '../models/Vendor.js';
import Alert from '../models/Alert.js';
import { recalculateAvgRating } from '../services/ratingService.js';

const MAX_REVIEW_LENGTH = 500;
const RATING_PROXIMITY_WINDOW_HOURS = parseInt(process.env.RATING_PROXIMITY_WINDOW_HOURS, 10) || 2;

export async function createRating(req, res) {
  try {
    const { vendorId, ratingValue, review } = req.body || {};
    const residentId = req.resident._id;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Valid vendorId is required' });
    }

    if (typeof ratingValue !== 'number' || ratingValue < 1 || ratingValue > 5) {
      return res
        .status(400)
        .json({ success: false, message: 'ratingValue must be a number between 1 and 5' });
    }

    if (review !== undefined && review !== null) {
      if (typeof review !== 'string') {
        return res.status(400).json({ success: false, message: 'review must be a string' });
      }
      if (review.trim().length > MAX_REVIEW_LENGTH) {
        return res.status(400).json({ success: false, message: `review must be at most ${MAX_REVIEW_LENGTH} characters` });
      }
    }

    const vendorExists = await Vendor.exists({ _id: vendorId });
    if (!vendorExists) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const proximityWindowStart = new Date(Date.now() - RATING_PROXIMITY_WINDOW_HOURS * 60 * 60 * 1000);
    const qualifyingAlert = await Alert.exists({
      Vendor_ID: vendorId,
      Resident_ID: residentId,
      Timestamp: { $gte: proximityWindowStart },
    });

    if (!qualifyingAlert) {
      return res.status(403).json({
        success: false,
        message: `Rating rejected: no proximity alert found for this vendor/resident pair in the last ${RATING_PROXIMITY_WINDOW_HOURS} hour(s). The vendor must have actually passed nearby before you can rate them.`,
      });
    }

    const rating = await Ratings.findOneAndUpdate(
      { Vendor_ID: vendorId, Resident_ID: residentId },
      {
        Vendor_ID: vendorId,
        Resident_ID: residentId,
        Rating: ratingValue,
        Review: review || '',
        RatingDate: new Date(),
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    const { avgRating, ratingCount } = await recalculateAvgRating(vendorId);

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
    console.error('[ratingController.createRating]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
