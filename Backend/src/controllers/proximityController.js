import mongoose from 'mongoose';
import Location from '../models/Location.js';
import Resident from '../models/Resident.js';
import { getDistanceAndEta } from '../utils/haversine.js';
import { computeVendorStatus } from '../utils/vendorStatus.js';

const DEFAULT_RADIUS_METERS = 1000;
const MAX_RADIUS_METERS = 5000;

// Find nearby vendors based on location
export async function getNearbyVendors(req, res) {
  try {
    const { lat, lng, category, minRating, residentId } = req.query;
    const radius = req.query.radius ? parseInt(req.query.radius, 10) : DEFAULT_RADIUS_METERS;

    let latitude, longitude, notificationRadiusMeters;

    // Use stored resident location if residentId provided
    if (residentId) {
      if (!mongoose.Types.ObjectId.isValid(residentId)) {
        return res.status(400).json({ success: false, message: 'Invalid residentId' });
      }

      const resident = await Resident.findById(residentId).select('Latitude Longitude NotificationRadius').lean();
      if (!resident) {
        return res.status(404).json({ success: false, message: 'Resident not found' });
      }

      if (resident.Latitude === null || resident.Longitude === null) {
        return res.status(400).json({ success: false, message: 'Resident location not set' });
      }

      latitude = resident.Latitude;
      longitude = resident.Longitude;
      notificationRadiusMeters = resident.NotificationRadius || DEFAULT_RADIUS_METERS / 2;
    } else {
      // Use query params for location
      latitude = parseFloat(lat);
      longitude = parseFloat(lng);

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
          .json({ success: false, message: 'Valid lat and lng query params are required when residentId not provided' });
      }

      notificationRadiusMeters = radius / 2;
    }

    if (!Number.isFinite(radius) || radius <= 0) {
      return res.status(400).json({ success: false, message: 'radius must be a positive number' });
    }

    if (category && !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category id' });
    }

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

    const vendorMatch = { Status: 'ACTIVE' };
    if (category) {
      vendorMatch.Category_ID = category;
    }

    const nearbyLocations = await Location.find({
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

      const distanceMeters = distanceKm * 1000;

      const status = computeVendorStatus(loc.Vendor_ID, loc, {
        distanceMeters,
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
  } catch (err) {
    console.error('[proximityController.getNearbyVendors]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
