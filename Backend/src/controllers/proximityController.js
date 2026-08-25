/**
 * controllers/proximityController.js
 * -----------------------------------------------------------------------
 * REST endpoint powering the resident app's map: on-demand "vendors near
 * this point" search, using the 2dsphere index on VendorLocation.geo.
 *
 * *** MODIFIED - ER-diagram alignment pass ***
 * Added optional `category` and `minRating` query params. This is what
 * actually makes ResidentCategoryPreference (see
 * controllers/residentPreferenceController.js) useful in practice - the
 * React app reads a resident's saved preferences, then passes the
 * chosen category id(s) here to filter the map. Kept as a generic query
 * param rather than reading the preference table server-side, since the
 * resident may also want to search ad-hoc for a category they haven't
 * saved as a standing preference.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import VendorLocation from '../models/VendorLocation.js';
import { getDistanceAndEta } from '../utils/haversine.js';

const DEFAULT_RADIUS_METERS = 1000;
const MAX_RADIUS_METERS = 5000;

/**
 * GET /api/vendors/nearby?lat=<num>&lng=<num>&radius=<meters>&category=<id>&minRating=<num>
 */
export async function getNearbyVendors(req, res) {
  try {
    const { lat, lng, category, minRating } = req.query;
    const radius = req.query.radius ? parseInt(req.query.radius, 10) : DEFAULT_RADIUS_METERS;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Valid lat and lng query params are required' });
    }

    if (!Number.isFinite(radius) || radius <= 0) {
      return res.status(400).json({ success: false, message: 'radius must be a positive number' });
    }

    // Optional category filter - validated but not required, so existing
    // callers that don't pass it keep working unchanged.
    if (category && !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category id' });
    }

    // Optional minimum-rating filter (the "Rating-based filtering" half
    // of slide 12's deliverable).
    let minRatingValue;
    if (minRating !== undefined) {
      minRatingValue = parseFloat(minRating);
      if (Number.isNaN(minRatingValue) || minRatingValue < 0 || minRatingValue > 5) {
        return res
          .status(400)
          .json({ success: false, message: 'minRating must be a number between 0 and 5' });
      }
    }

    const cappedRadius = Math.min(radius, MAX_RADIUS_METERS);

    // Expired (TTL-reaped) locations are already gone by the time this
    // query runs - no need to manually filter by ExpiresAt.
    const vendorMatch = { Status: 'ACTIVE' };
    if (category) {
      vendorMatch.Category_ID = category;
    }

    const nearbyLocations = await VendorLocation.find({
      geo: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: cappedRadius,
        },
      },
    })
      .populate({
        path: 'Vendor_ID',
        select: 'VendorName Vehicle Status AvgRating Category_ID',
        match: vendorMatch,
      })
      .limit(50)
      .lean();

    // populate's `match` returns null (not a removed array element) for
    // vendors that don't match Status/Category_ID - filter those out,
    // then apply the minRating filter (can't express ">=" cleanly inside
    // populate's match alongside the other conditions, so it's applied here).
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

      return {
        Vendor_ID: loc.Vendor_ID._id,
        VendorName: loc.Vendor_ID.VendorName,
        Vehicle: loc.Vendor_ID.Vehicle,
        AvgRating: loc.Vendor_ID.AvgRating,
        Category_ID: loc.Vendor_ID.Category_ID,
        approximateLocation: { latitude: vendorLat, longitude: vendorLng },
        distanceKm,
        etaMinutes,
        lastUpdated: loc.UpdatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: results.length,
      radiusMeters: cappedRadius,
      data: results,
    });
  } catch (err) {
    console.error('[proximityController.getNearbyVendors]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
