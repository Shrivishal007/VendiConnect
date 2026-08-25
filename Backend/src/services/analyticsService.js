/**
 * services/analyticsService.js  *** NEW THIS WEEK ***
 * -----------------------------------------------------------------------
 * Week 4: generates a clean, self-contained weekly summary for a single
 * vendor - past 7 days of Alert activity (how many residents were
 * notified) plus Rating activity. The output shape is intentionally
 * flat and consumer-agnostic: your teammate's WhatsApp messaging
 * service can pull this JSON and template it directly into a weekly
 * WhatsApp digest message without needing to know anything about
 * Mongo/aggregation internals.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import Rating from '../models/Rating.js';
import Vendor from '../models/Vendor.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Builds the weekly analytics summary for one vendor.
 *
 * @param {string} vendorId
 * @returns {Promise<Object|null>} summary object, or null if the vendor doesn't exist
 *
 * Example return shape:
 * {
 *   vendorId: "66df...",
 *   vendorName: "Ramesh's Vegetable Cart",
 *   period: { from: "2026-08-19T00:00:00.000Z", to: "2026-08-26T00:00:00.000Z" },
 *   alerts: {
 *     totalAlertsSent: 42,
 *     uniqueResidentsNotified: 18,
 *     avgEtaMinutesAtAlert: 6.3
 *   },
 *   ratings: {
 *     newRatingsThisWeek: 5,
 *     avgRatingThisWeek: 4.4,
 *     overallAvgRating: 4.2,
 *     overallRatingCount: 37
 *   },
 *   generatedAt: "2026-08-26T09:00:00.000Z"
 * }
 */
export async function generateWeeklyVendorSummary(vendorId) {
  const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

  const vendor = await Vendor.findById(vendorObjectId).select('VendorName AvgRating RatingCount').lean();
  if (!vendor) {
    return null;
  }

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - SEVEN_DAYS_MS);

  const [alertStats, ratingStats] = await Promise.all([
    getWeeklyAlertStats(vendorObjectId, periodStart, periodEnd),
    getWeeklyRatingStats(vendorObjectId, periodStart, periodEnd),
  ]);

  return {
    vendorId: String(vendor._id),
    vendorName: vendor.VendorName,
    period: {
      from: periodStart.toISOString(),
      to: periodEnd.toISOString(),
    },
    alerts: alertStats,
    ratings: {
      newRatingsThisWeek: ratingStats.newRatingsThisWeek,
      avgRatingThisWeek: ratingStats.avgRatingThisWeek,
      // Overall (all-time) figures come straight from the Vendor doc's
      // denormalized fields, kept fresh by ratingService.recalculateAvgRating().
      overallAvgRating: vendor.AvgRating,
      overallRatingCount: vendor.RatingCount,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Aggregates Alert documents for the vendor in the given window:
 * total alerts sent, count of DISTINCT residents notified (a resident
 * could be alerted more than once in a week if outside the 45-min
 * throttle window on different days), and the average ETA at the time
 * of alert (a rough proxy for "how close does this vendor typically get
 * to residents before they're notified").
 * @private
 */
async function getWeeklyAlertStats(vendorObjectId, periodStart, periodEnd) {
  const [result] = await Alert.aggregate([
    {
      $match: {
        Vendor_ID: vendorObjectId,
        Timestamp: { $gte: periodStart, $lte: periodEnd },
      },
    },
    {
      $group: {
        _id: null,
        totalAlertsSent: { $sum: 1 },
        uniqueResidents: { $addToSet: '$Resident_ID' },
        avgEtaMinutesAtAlert: { $avg: '$EtaMinutes' },
      },
    },
    {
      $project: {
        _id: 0,
        totalAlertsSent: 1,
        uniqueResidentsNotified: { $size: '$uniqueResidents' },
        avgEtaMinutesAtAlert: { $round: ['$avgEtaMinutesAtAlert', 1] },
      },
    },
  ]);

  return (
    result || {
      totalAlertsSent: 0,
      uniqueResidentsNotified: 0,
      avgEtaMinutesAtAlert: 0,
    }
  );
}

/**
 * Aggregates Rating documents created for the vendor in the given window.
 * @private
 */
async function getWeeklyRatingStats(vendorObjectId, periodStart, periodEnd) {
  const [result] = await Rating.aggregate([
    {
      $match: {
        Vendor_ID: vendorObjectId,
        RatingDate: { $gte: periodStart, $lte: periodEnd },
      },
    },
    {
      $group: {
        _id: null,
        newRatingsThisWeek: { $sum: 1 },
        avgRatingThisWeek: { $avg: '$RatingValue' },
      },
    },
    {
      $project: {
        _id: 0,
        newRatingsThisWeek: 1,
        avgRatingThisWeek: { $round: ['$avgRatingThisWeek', 1] },
      },
    },
  ]);

  return (
    result || {
      newRatingsThisWeek: 0,
      avgRatingThisWeek: 0,
    }
  );
}
