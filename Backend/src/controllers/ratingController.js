/**
 * @file ratingController.js
 * @description Controller for vendor rating operations.
 * Handles creation of ratings with proximity validation and average rating recalculation.
 * @module controllers/ratingController
 */

import mongoose from 'mongoose';
import Ratings from '../models/Ratings.js';
import Vendor from '../models/Vendor.js';
import Alert from '../models/Alert.js';

const RATING_PROXIMITY_WINDOW_HOURS = parseInt(process.env.RATING_PROXIMITY_WINDOW_HOURS, 10) || 2;

export async function createRating(req, res) {
  try {
    const { vendorId, ratingValue, review, residentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Valid vendorId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(residentId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Valid residentId is required' });
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

    const allRatings = await Ratings.find({ Vendor_ID: vendorId });
    const avgRating = allRatings.length > 0 
      ? allRatings.reduce((sum, r) => sum + r.Rating, 0) / allRatings.length 
      : 0;
    
    await Vendor.findByIdAndUpdate(vendorId, { 
      AvgRating: Math.round(avgRating * 10) / 10, 
      RatingCount: allRatings.length 
    });

    return res.status(201).json({
      success: true,
      message: 'Rating recorded',
      data: {
        rating,
        vendorAvgRating: Math.round(avgRating * 10) / 10,
        vendorRatingCount: allRatings.length,
      },
    });
  } catch (err) {
    console.error('[ratingController.createRating]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
