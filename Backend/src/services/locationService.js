import mongoose from 'mongoose';
import Location from '../models/Location.js';
import Vendor from '../models/Vendor.js';
import { SLA_TARGETS } from '../config/slaTargets.js';
import { toApproximateGeoPoint } from '../utils/privacy.js';
import { hasActiveConsent, touchLastActive } from './vendorSessionService.js';
import { logActivity } from './activityLogService.js';

const LOCATION_TTL_MINUTES = parseInt(process.env.LOCATION_TTL_MINUTES, 10) || 30;

// Error carrying the HTTP status the controller should answer with
export class LocationIngestError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'LocationIngestError';
    this.statusCode = statusCode;
  }
}

// Validate, authorize (vendor exists, not suspended, consent active) and store a vendor location
export async function ingestVendorLocation(vendorId, latitude, longitude) {
  const startedAt = Date.now();

  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new LocationIngestError('Invalid vendorId', 400);
  }

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

  const geoPoint = toApproximateGeoPoint(latitude, longitude);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCATION_TTL_MINUTES * 60 * 1000);

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

  // Only touches the document when the vendor was actually inactive (suspended vendors were rejected above)
  await Vendor.updateOne({ _id: vendorId, Status: 'INACTIVE' }, { $set: { Status: 'ACTIVE' } });

  // Both helpers swallow and log their own errors, so they never fail an ingest
  touchLastActive(vendorId);
  logActivity(vendorId, 'Location Updated');

  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > SLA_TARGETS.WEBHOOK_PROCESSING_LATENCY_MS) {
    console.warn(
      `[locationService] Synchronous ingest for vendor ${vendorId} took ${elapsedMs}ms, exceeding the ${SLA_TARGETS.WEBHOOK_PROCESSING_LATENCY_MS}ms SLA target`
    );
  }

  return updatedLocation;
}
