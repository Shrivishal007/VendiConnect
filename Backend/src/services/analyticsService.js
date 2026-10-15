import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import Ratings from '../models/Ratings.js';
import Vendor from '../models/Vendor.js';
import ActivityLog from '../models/ActivityLog.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Generate weekly summary report for a vendor including alerts and ratings
export async function generateWeeklyVendorSummary(vendorId) {
  const vendorObjectId =
    typeof vendorId === 'string' ? new mongoose.Types.ObjectId(vendorId) : vendorId;

  const vendor = await Vendor.findById(vendorObjectId).select('Name AvgRating RatingCount').lean();
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
    vendorName: vendor.Name,
    period: {
      from: periodStart.toISOString(),
      to: periodEnd.toISOString(),
    },
    alerts: alertStats,
    ratings: {
      newRatingsThisWeek: ratingStats.newRatingsThisWeek,
      avgRatingThisWeek: ratingStats.avgRatingThisWeek,
      overallAvgRating: vendor.AvgRating,
      overallRatingCount: vendor.RatingCount,
    },
    generatedAt: new Date().toISOString(),
  };
}

// Calculate alert statistics for a vendor within a time period
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

// Calculate rating statistics for a vendor within a time period
async function getWeeklyRatingStats(vendorObjectId, periodStart, periodEnd) {
  const [result] = await Ratings.aggregate([
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
        avgRatingThisWeek: { $avg: '$Rating' },
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

// Get star rating distribution (1-5 stars) for a vendor
async function getStarDistribution(vendorObjectId, periodStart, periodEnd) {
  const rows = await Ratings.aggregate([
    {
      $match: {
        Vendor_ID: vendorObjectId,
        RatingDate: { $gte: periodStart, $lte: periodEnd },
      },
    },
    { $group: { _id: '$Rating', count: { $sum: 1 } } },
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rows.forEach((row) => {
    if (row._id >= 1 && row._id <= 5) {
      distribution[row._id] = row.count;
    }
  });

  return distribution;
}

// Calculate vendor active hours based on location update events
async function getVendorActiveHours(vendorObjectId, periodStart, periodEnd) {
  const results = await ActivityLog.aggregate([
    {
      $match: {
        Vendor_ID: vendorObjectId,
        Event: 'Location Updated',
        EventTime: { $gte: periodStart, $lte: periodEnd },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$EventTime' } },
        firstPing: { $min: '$EventTime' },
        lastPing: { $max: '$EventTime' },
      },
    },
    {
      $group: {
        _id: null,
        totalHours: {
          $sum: { $divide: [{ $subtract: ['$lastPing', '$firstPing'] }, 1000 * 60 * 60] },
        },
        activeDays: { $sum: 1 },
      },
    },
  ]);

  const result = results[0];
  return {
    totalActiveHours: result ? Math.round(result.totalHours * 10) / 10 : 0,
    activeDays: result ? result.activeDays : 0,
  };
}

// Generate comprehensive vendor analytics with configurable time window
export async function generateVendorAnalytics(vendorId, windowDays = 7) {
  const vendorObjectId =
    typeof vendorId === 'string' ? new mongoose.Types.ObjectId(vendorId) : vendorId;

  const vendor = await Vendor.findById(vendorObjectId).select('Name AvgRating RatingCount Status').lean();
  if (!vendor) {
    return null;
  }

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const [alertStats, starDistribution, activeHours] = await Promise.all([
    getWeeklyAlertStats(vendorObjectId, periodStart, periodEnd),
    getStarDistribution(vendorObjectId, periodStart, periodEnd),
    getVendorActiveHours(vendorObjectId, periodStart, periodEnd),
  ]);

  return {
    vendorId: String(vendor._id),
    vendorName: vendor.Name,
    currentStatus: vendor.Status,
    period: { from: periodStart.toISOString(), to: periodEnd.toISOString(), windowDays },
    totalResidentAlerts: alertStats.totalAlertsSent,
    uniqueResidentsNotified: alertStats.uniqueResidentsNotified,
    activeHours,
    starDistribution,
    overallAvgRating: vendor.AvgRating,
    overallRatingCount: vendor.RatingCount,
    generatedAt: new Date().toISOString(),
  };
}
