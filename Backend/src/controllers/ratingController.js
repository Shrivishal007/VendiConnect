import mongoose from 'mongoose';
import Rating from '../models/Rating.js';
import Vendor from '../models/Vendor.js';
import Alert from '../models/Alert.js';
import { recalculateAvgRating } from '../services/ratingService.js';
import { logActivity } from '../services/activityLogService.js';

const RATING_PROXIMITY_WINDOW_HOURS = parseInt(process.env.RATING_PROXIMITY_WINDOW_HOURS, 10) || 2;

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

    const { avgRating, ratingCount } = await recalculateAvgRating(vendorId);

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
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: 'Rating for this vendor/resident pair already exists' });
    }

    console.error('[ratingController.createRating]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
