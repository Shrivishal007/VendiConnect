import mongoose from 'mongoose';
import Location from '../models/Location.js';
import Vendor from '../models/Vendor.js';
import { toApproximateGeoPoint } from '../utils/privacy.js';
import { matchAndNotifyResidents } from '../services/proximityWorker.js';

const LOCATION_TTL_MINUTES = parseInt(process.env.LOCATION_TTL_MINUTES, 10) || 30;

const WEBHOOK_LATENCY_TARGET_MS = 120;

export async function ingestVendorLocation(vendorId, latitude, longitude) {
  const startedAt = Date.now();

  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new Error('Invalid vendorId');
  }

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Invalid latitude or longitude');
  }

  const vendorExists = await Vendor.exists({ _id: vendorId });
  if (!vendorExists) {
    throw new Error('Vendor not found');
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

  await Vendor.updateOne({ _id: vendorId, Status: { $ne: 'SUSPENDED' } }, { $set: { Status: 'ACTIVE' } });

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
    const { latitude, longitude } = req.body || {};

    const updatedLocation = await ingestVendorLocation(vendorId, latitude, longitude);

    matchAndNotifyResidents(vendorId, updatedLocation.geo).catch((err) =>
      console.error('[locationController] proximity pass failed:', err.message)
    );

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
    const statusCode = err.message === 'Invalid vendorId' || err.message === 'Invalid latitude or longitude' ? 400 : err.message === 'Vendor not found' ? 404 : 500;
    return res.status(statusCode).json({ success: false, message: err.message });
  }
}
