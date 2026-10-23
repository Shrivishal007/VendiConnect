import mongoose from 'mongoose';
import Location from '../models/Location.js';
import Vendor from '../models/Vendor.js';
import { SLA_TARGETS } from '../config/slaTargets.js';
import { toApproximateGeoPoint } from '../utils/privacy.js';
import { hasActiveConsent, touchLastActive } from './vendorSessionService.js';
import { logActivity } from './activityLogService.js';
import { requiredPositiveInteger } from '../config/env.js';

const LOCATION_TTL_MINUTES = requiredPositiveInteger('LOCATION_TTL_MINUTES');

// Error class for location ingestion failures with HTTP status codes
export class LocationIngestError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'LocationIngestError';
    this.statusCode = statusCode;
  }
}

// Validate vendor details, verify consent, and store the approximate location
export async function ingestVendorLocation(vendorId, latitude, longitude) {
  const startedAt = Date.now();

  // Validate the vendor ID format
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new LocationIngestError('Invalid vendorId', 400);
  }

  // Validate coordinate types, values, and geographic ranges
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new LocationIngestError('Invalid latitude or longitude', 400);
  }

  // Fetch vendor status and verify location-sharing consent concurrently
  const [vendor, consentActive] = await Promise.all([
    Vendor.findById(vendorId).select('Status').lean(),
    hasActiveConsent(vendorId),
  ]);

  if (!vendor) {
    throw new LocationIngestError('Vendor not found', 404);
  }
  if (vendor.Status === 'SUSPENDED') {
    throw new LocationIngestError('Vendor is suspended', 403);
  }
  if (!consentActive) {
    throw new LocationIngestError('Consent required before location can be shared', 403);
  }

  // Approximate coordinates and calculate their expiration time
  const geoPoint = toApproximateGeoPoint(latitude, longitude);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCATION_TTL_MINUTES * 60 * 1000);

  // Check whether the existing location has expired
  const existingLocation = await Location.findOne({ Vendor_ID: vendorId }).lean();
  const wasExpired = !existingLocation || existingLocation.ExpiresAt <= now;

  // Upsert the vendor's location and return the updated document
  const updatedLocation = await Location.findOneAndUpdate(
    { Vendor_ID: vendorId },
    {
      Vendor_ID: vendorId,
      geo: geoPoint,
      UpdatedAt: now,
      ExpiresAt: expiresAt,
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );

  // Update vendor status to ACTIVE and record last location update
  await Vendor.updateOne(
    { _id: vendorId },
    { $set: { Status: 'ACTIVE', LastLocationUpdate: now } }
  );

  // Update session activity and log the location event without blocking ingestion
  touchLastActive(vendorId);
  logActivity(vendorId, 'Location Updated');

  // Warn when synchronous processing exceeds the configured SLA target
  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > SLA_TARGETS.WEBHOOK_PROCESSING_LATENCY_MS) {
    console.warn(
      `[locationService] Synchronous ingest for vendor ${vendorId} took ${elapsedMs}ms, exceeding the ${SLA_TARGETS.WEBHOOK_PROCESSING_LATENCY_MS}ms SLA target`
    );
  }

  return updatedLocation;
}
