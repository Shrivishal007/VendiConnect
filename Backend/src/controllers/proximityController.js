import mongoose from 'mongoose';
import Location from '../models/Location.js';
import { getDistanceAndEta } from '../utils/haversine.js';
import { computeVendorStatus } from '../utils/vendorStatus.js';

const DEFAULT_RADIUS_METERS = 1000;
const MAX_RADIUS_METERS = 5000;

function isValidCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

// Validate the shared query params (radius, category, minRating)
function parseSearchFilters(query) {
  const radius = query.radius !== undefined ? parseInt(query.radius, 10) : DEFAULT_RADIUS_METERS;
  if (!Number.isFinite(radius) || radius <= 0) {
    return { error: 'radius must be a positive number' };
  }

  const { category, minRating } = query;
  if (category && !mongoose.Types.ObjectId.isValid(category)) {
    return { error: 'Invalid category id' };
  }

  let minRatingValue;
  if (minRating !== undefined) {
    minRatingValue = parseFloat(minRating);
    if (Number.isNaN(minRatingValue) || minRatingValue < 0 || minRatingValue > 5) {
      return { error: 'minRating must be a number between 0 and 5' };
    }
  }

  return { radius, category, minRatingValue };
}

// Run the geo search around a point and send the response
async function searchAndRespond(res, { latitude, longitude, radius, category, minRatingValue, notificationRadiusMeters }) {
  const cappedRadius = Math.min(radius, MAX_RADIUS_METERS);

  const vendorMatch = { Status: 'ACTIVE' };
  if (category) {
    vendorMatch.Category_ID = category;
  }

  const nearbyLocations = await Location.find({
    ExpiresAt: { $gt: new Date() },
    geo: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: cappedRadius,
      },
    },
  })
    .populate({
      path: 'Vendor_ID',
      select: 'Name Vehicle Status AvgRating Category_ID',
      match: vendorMatch,
    })
    .limit(50)
    .lean();

  const activeResults = nearbyLocations.filter(
    (loc) =>
      loc.Vendor_ID !== null &&
      (minRatingValue === undefined || loc.Vendor_ID.AvgRating >= minRatingValue)
  );

  const results = activeResults.map((loc) => {
    const vendorLng = loc.geo.coordinates[0];
    const vendorLat = loc.geo.coordinates[1];

    const { distanceKm, etaMinutes } = getDistanceAndEta(
      { lat: latitude, lng: longitude },
      { lat: vendorLat, lng: vendorLng }
    );

    const status = computeVendorStatus(loc.Vendor_ID, loc, {
      distanceMeters: distanceKm * 1000,
      notificationRadiusMeters,
    });

    return {
      Vendor_ID: loc.Vendor_ID._id,
      VendorName: loc.Vendor_ID.Name,
      Vehicle: loc.Vendor_ID.Vehicle,
      AvgRating: loc.Vendor_ID.AvgRating,
      Category_ID: loc.Vendor_ID.Category_ID,
      approximateLocation: { latitude: vendorLat, longitude: vendorLng },
      distanceKm,
      etaMinutes,
      status,
      lastUpdated: loc.UpdatedAt,
    };
  });

  return res.status(200).json({
    success: true,
    count: results.length,
    radiusMeters: cappedRadius,
    notificationRadiusMeters,
    data: results,
  });
}

// Find nearby vendors around coordinates supplied in the query (public)
export async function getNearbyVendors(req, res) {
  try {
    if (req.query.residentId !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'residentId is not accepted here - use GET /api/vendors/nearby/me while signed in',
      });
    }

    const latitude = parseFloat(req.query.lat);
    const longitude = parseFloat(req.query.lng);

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Valid lat and lng query params are required' });
    }

    const filters = parseSearchFilters(req.query);
    if (filters.error) {
      return res.status(400).json({ success: false, message: filters.error });
    }

    return await searchAndRespond(res, {
      latitude,
      longitude,
      radius: filters.radius,
      category: filters.category,
      minRatingValue: filters.minRatingValue,
      notificationRadiusMeters: filters.radius / 2,
    });
  } catch (err) {
    console.error('[proximityController.getNearbyVendors]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Find nearby vendors around the signed-in resident's stored location (requires resident auth)
export async function getNearbyVendorsForResident(req, res) {
  try {
    const resident = req.resident;

    if (resident.Latitude === null || resident.Longitude === null) {
      return res.status(400).json({ success: false, message: 'Resident location not set' });
    }

    const filters = parseSearchFilters(req.query);
    if (filters.error) {
      return res.status(400).json({ success: false, message: filters.error });
    }

    return await searchAndRespond(res, {
      latitude: resident.Latitude,
      longitude: resident.Longitude,
      radius: filters.radius,
      category: filters.category,
      minRatingValue: filters.minRatingValue,
      notificationRadiusMeters: resident.NotificationRadius || DEFAULT_RADIUS_METERS / 2,
    });
  } catch (err) {
    console.error('[proximityController.getNearbyVendorsForResident]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
