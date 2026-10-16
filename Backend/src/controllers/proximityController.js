/**
 * controllers/proximityController.js
 * -----------------------------------------------------------------------
 * REST endpoint powering the resident app's map: "show me active
 * vendors near my current location". Also exposes an endpoint for
 * on-demand search from an arbitrary point (not just the resident's
 * saved home location), since the map screen lets residents pan/search
 * anywhere - not just around home.
 * -----------------------------------------------------------------------
 */

import VendorLocation from '../models/VendorLocation.js';
import { getDistanceAndEta } from '../utils/haversine.js';

const DEFAULT_RADIUS_METERS = 1000; // 1 km default search radius
const MAX_RADIUS_METERS = 5000; // hard cap to protect the M0 cluster from expensive scans

/**
 * GET /api/vendors/nearby?lat=<num>&lng=<num>&radius=<meters>&category=<id>
 *
 * Uses MongoDB's $near geospatial operator (via the 2dsphere index on
 * VendorLocation.geo) to find active vendor locations within `radius`
 * meters of the given point, sorted nearest-first (this is $near's
 * built-in behavior - no extra $sort needed).
 *
 * For each hit, also computes a Haversine-based ETA client-side-friendly
 * value using utils/haversine, so the frontend doesn't need to
 * re-implement the distance math.
 */
async function getNearbyVendors(req, res) {
  try {
    const { lat, lng } = req.query;
    const radius = req.query.radius ? Number(req.query.radius) : DEFAULT_RADIUS_METERS;

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
        .json({ success: false, message: 'Valid latitude and longitude are required' });
    }

    if (!Number.isFinite(radius) || radius <= 0) {
      return res.status(400).json({ success: false, message: 'radius must be a positive number' });
    }

    const cappedRadius = Math.min(radius, MAX_RADIUS_METERS);

    // $near requires a 2dsphere index (already defined on VendorLocation.geo)
    // and automatically returns results sorted by distance ascending.
    // Expired (TTL-reaped) vendor locations are already gone from the
    // collection by the time this query runs, so there's no need to
    // manually filter by ExpiresAt here - MongoDB's TTL monitor handles it.
    const nearbyLocations = await VendorLocation.find({
      geo: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude], // GeoJSON order: [lng, lat]
          },
          $maxDistance: cappedRadius, // meters
        },
      },
    })
      .populate({
        path: 'Vendor_ID',
        select: 'VendorName Vehicle Status AvgRating Category_ID',
        match: { Status: 'ACTIVE' }, // only surface vendors currently marked active
      })
      .limit(50) // safety cap for M0 tier read performance
      .lean();

    // populate's `match` returns null (not a removed array element) for
    // vendors that don't match - filter those out here.
    const activeResults = nearbyLocations.filter((loc) => loc.Vendor_ID !== null);

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
        // Approximate location only - never expose raw/exact coordinates,
        // and this is already the truncated grid-cell value from storage.
        approximateLocation: {
          latitude: vendorLat,
          longitude: vendorLng,
        },
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

export default getNearbyVendors;
