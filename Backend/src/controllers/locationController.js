import mongoose from 'mongoose';
import VendorLocation from '../models/VendorLocation.js';
import Vendor from '../models/Vendor.js';
import { toApproximateGeoPoint } from '../utils/geoPrivacy.js';
import { matchAndNotifyResidents } from '../services/proximityWorker.js';
import { logActivity } from '../services/activityLogService.js';
import { touchLastActive, hasActiveConsent } from '../services/vendorSessionService.js';
import { AppError } from '../utils/AppError.js';

const LOCATION_TTL_MINUTES = parseInt(process.env.LOCATION_TTL_MINUTES, 10) || 30;

const WEBHOOK_LATENCY_TARGET_MS = 120;

export async function ingestVendorLocation(vendorId, latitude, longitude) {
  const startedAt = Date.now();

  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new AppError(400, 'Invalid vendorId');
  }

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new AppError(400, 'Invalid latitude or longitude');
  }

  const vendorExists = await Vendor.exists({ _id: vendorId });
  if (!vendorExists) {
    throw new AppError(404, 'Vendor not found');
  }

  const consentActive = await hasActiveConsent(vendorId);
  if (!consentActive) {
    throw new AppError(
      403,
      'Vendor has not granted (or has withdrawn) DPDPA location-tracking consent - ping rejected'
    );
  }

  const geoPoint = toApproximateGeoPoint(latitude, longitude);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCATION_TTL_MINUTES * 60 * 1000);

  const updatedLocation = await VendorLocation.findOneAndUpdate(
    { Vendor_ID: vendorId },
    {
      Vendor_ID: vendorId,
      geo: geoPoint,
      UpdatedAt: now,
      ExpiresAt: expiresAt,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await Vendor.updateOne({ _id: vendorId }, { $set: { Status: 'ACTIVE' } });

  touchLastActive(vendorId);
  logActivity(vendorId, 'Location Updated', `Lat/Lng updated to ${geoPoint.coordinates[1]}, ${geoPoint.coordinates[0]}`);

  matchAndNotifyResidents(vendorId, geoPoint)
    .then((summary) => {
      console.log(`[locationController] Proximity pass for vendor ${vendorId}:`, JSON.stringify(summary));
    })
    .catch((err) => {
      console.error('[locationController] Proximity pass failed unexpectedly:', err);
    });

  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > WEBHOOK_LATENCY_TARGET_MS) {
    console.warn(
      `[locationController] Synchronous ingest for vendor ${vendorId} took ${elapsedMs}ms, exceeding the ${WEBHOOK_LATENCY_TARGET_MS}ms SLA target`
    );
  }

  return updatedLocation;
}

export async function updateVendorLocation(req, res) {
  try {
    const { vendorId } = req.params;
    const { latitude, longitude } = req.body;

    const updatedLocation = await ingestVendorLocation(vendorId, latitude, longitude);

    return res.status(200).json({
      success: true,
      message: 'Vendor location updated',
      data: {
        Vendor_ID: vendorId,
        geo: updatedLocation.geo,
        ExpiresAt: updatedLocation.ExpiresAt,
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error('[locationController.updateVendorLocation]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
