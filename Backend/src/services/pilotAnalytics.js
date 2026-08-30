import Alert from '../models/Alert.js';
import Rating from '../models/Rating.js';
import ActivityLog from '../models/ActivityLog.js';
import Vendor from '../models/Vendor.js';

const DEFAULT_WINDOW_DAYS = 7;

async function getTotalAlertsDispatched(periodStart, periodEnd) {
  return Alert.countDocuments({ Timestamp: { $gte: periodStart, $lte: periodEnd } });
}

async function getEstimatedActiveVendorHours(periodStart, periodEnd) {
  const results = await ActivityLog.aggregate([
    {
      $match: {
        Event: 'Location Updated',
        EventTime: { $gte: periodStart, $lte: periodEnd },
      },
    },
    {
      $group: {
        _id: {
          vendor: '$Vendor_ID',
          day: { $dateToString: { format: '%Y-%m-%d', date: '$EventTime' } },
        },
        firstPing: { $min: '$EventTime' },
        lastPing: { $max: '$EventTime' },
        pingCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        vendor: '$_id.vendor',
        day: '$_id.day',
        activeHours: {
          $divide: [{ $subtract: ['$lastPing', '$firstPing'] }, 1000 * 60 * 60],
        },
        pingCount: 1,
      },
    },
    {
      $group: {
        _id: null,
        totalActiveHours: { $sum: '$activeHours' },
        vendorDayRecords: { $sum: 1 },
        distinctVendors: { $addToSet: '$vendor' },
      },
    },
  ]);

  const result = results[0];
  if (!result) {
    return { totalActiveHours: 0, avgActiveHoursPerVendorDay: 0, distinctActiveVendors: 0 };
  }

  return {
    totalActiveHours: Math.round(result.totalActiveHours * 10) / 10,
    avgActiveHoursPerVendorDay:
      Math.round((result.totalActiveHours / result.vendorDayRecords) * 10) / 10,
    distinctActiveVendors: result.distinctVendors.length,
  };
}

async function getAvgRatingPerCategory(periodStart, periodEnd) {
  return Rating.aggregate([
    { $match: { RatingDate: { $gte: periodStart, $lte: periodEnd } } },
    {
      $lookup: {
        from: 'vendors',
        localField: 'Vendor_ID',
        foreignField: '_id',
        as: 'vendor',
      },
    },
    { $unwind: '$vendor' },
    {
      $group: {
        _id: '$vendor.Category_ID',
        avgRating: { $avg: '$RatingValue' },
        ratingCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        categoryId: '$_id',
        categoryName: { $ifNull: ['$category.Name', 'Uncategorized'] },
        avgRating: { $round: ['$avgRating', 2] },
        ratingCount: 1,
      },
    },
    { $sort: { avgRating: -1 } },
  ]);
}

async function getNotificationToInteractionDensity(periodStart, periodEnd) {
  const [alertPairs, ratingPairs] = await Promise.all([
    Alert.aggregate([
      { $match: { Timestamp: { $gte: periodStart, $lte: periodEnd } } },
      {
        $group: {
          _id: { vendor: '$Vendor_ID', resident: '$Resident_ID' },
          alertCount: { $sum: 1 },
        },
      },
    ]),
    Rating.aggregate([
      { $match: { RatingDate: { $gte: periodStart, $lte: periodEnd } } },
      {
        $group: {
          _id: { vendor: '$Vendor_ID', resident: '$Resident_ID' },
        },
      },
    ]),
  ]);

  const ratedPairKeys = new Set(
    ratingPairs.map((r) => `${r._id.vendor}:${r._id.resident}`)
  );

  const totalAlertedPairs = alertPairs.length;
  const interactedPairs = alertPairs.filter((pair) =>
    ratedPairKeys.has(`${pair._id.vendor}:${pair._id.resident}`)
  ).length;

  const densityRatio = totalAlertedPairs > 0 ? interactedPairs / totalAlertedPairs : 0;

  return {
    totalAlertedVendorResidentPairs: totalAlertedPairs,
    interactedVendorResidentPairs: interactedPairs,
    notificationToInteractionDensity: Math.round(densityRatio * 1000) / 1000,
  };
}

export async function generatePilotReport(options = {}) {
  const periodEnd = options.to instanceof Date ? options.to : new Date();
  const periodStart =
    options.from instanceof Date
      ? options.from
      : new Date(periodEnd.getTime() - (options.windowDays || DEFAULT_WINDOW_DAYS) * 24 * 60 * 60 * 1000);

  const [totalAlertsDispatched, activeVendorHours, avgRatingPerCategory, interactionDensity, totalVendors] =
    await Promise.all([
      getTotalAlertsDispatched(periodStart, periodEnd),
      getEstimatedActiveVendorHours(periodStart, periodEnd),
      getAvgRatingPerCategory(periodStart, periodEnd),
      getNotificationToInteractionDensity(periodStart, periodEnd),
      Vendor.countDocuments({}),
    ]);

  return {
    period: { from: periodStart.toISOString(), to: periodEnd.toISOString() },
    totalVendorsRegistered: totalVendors,
    totalAlertsDispatched,
    activeVendorHours,
    avgRatingPerCategory,
    interactionDensity,
    generatedAt: new Date().toISOString(),
  };
}
