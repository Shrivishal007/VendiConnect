/**
 * controllers/locationController.js
 * -----------------------------------------------------------------------
 * Handles writes to a vendor's live location. This is called by the
 * WhatsApp-webhook layer's controller AFTER it has already parsed an
 * incoming "Live Location" message into plain { vendorId, latitude,
 * longitude } - this file has no knowledge of WhatsApp payload formats.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import VendorLocation from '../models/VendorLocation.js';
import Vendor from '../models/Vendor.js';
import { toApproximateGeoPoint } from '../utils/geoPrivacy.js';

const LOCATION_TTL_MINUTES = parseInt(process.env.LOCATION_TTL_MINUTES, 10) || 30;

/**
 * POST /api/vendors/:vendorId/location
 * Body: { latitude: number, longitude: number }
 *
 * Upserts the vendor's VendorLocation document:
 *  - Truncates raw GPS to a privacy-safe ~50-100m grid cell.
 *  - Resets ExpiresAt to (now + 30 min), which is what "refreshes" the
 *    TTL countdown - MongoDB's TTL monitor only cares about the current
 *    value of ExpiresAt, so overwriting it on every ping effectively
 *    keeps the vendor "alive" for as long as they keep sending pings.
 *  - Also flips Vendor.Status to ACTIVE if it wasn't already, since a
 *    fresh location ping is a strong signal the vendor is out and open.
 *
 * Upsert (rather than insert) is used because each vendor has exactly
 * ONE current-location document (enforced by the `unique: true` index
 * on VendorLocation.Vendor_ID) - every subsequent ping overwrites it.
 */
async function updateVendorLocation(req, res) {
  try {
    const { vendorId } = req.params;
    const { latitude, longitude } = req.body;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

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
        .json({ success: false, message: 'Invalid latitude or longitude' });
    }

    // Confirm the vendor actually exists before writing a location for it.
    const vendorExists = await Vendor.exists({ _id: vendorId });
    if (!vendorExists) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Privacy step: truncate raw coordinates to a GeoJSON Point BEFORE
    // anything touches the database.
    const geoPoint = toApproximateGeoPoint(latitude, longitude);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCATION_TTL_MINUTES * 60 * 1000);

    const updatedLocation = await VendorLocation.findOneAndUpdate(
      { Vendor_ID: vendorId },
      {
        Vendor_ID: vendorId,
        geo: geoPoint,
        UpdatedAt: now,
        ExpiresAt: expiresAt, // <-- this is the TTL refresh
      },
      {
        new: true, // return the updated doc
        upsert: true, // create it if this is the vendor's first-ever ping
        setDefaultsOnInsert: true,
      }
    );

    // Best-effort side effect: mark vendor ACTIVE on a fresh ping.
    // Not awaited-and-blocking-critical, but awaited here for consistency
    // since M0 tier traffic is low; fire-and-forget isn't necessary.
    await Vendor.updateOne({ _id: vendorId }, { $set: { Status: 'ACTIVE' } });

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
    console.error('[locationController.updateVendorLocation]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export default updateVendorLocation;
