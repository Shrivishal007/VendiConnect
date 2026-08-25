/**
 * controllers/locationController.js
 * -----------------------------------------------------------------------
 * Handles writes to a vendor's live location. Called by the WhatsApp-
 * webhook layer's controller after it has already parsed an incoming
 * Live Location message into { vendorId, latitude, longitude }.
 *
 * *** MODIFIED THIS WEEK (Week 3) ***
 * After a successful location upsert, this now triggers
 * proximityWorker.matchAndNotifyResidents() - Week 3's "when a vendor's
 * location updates, find nearby residents and push-notify them" pipeline.
 *
 * *** MODIFIED AGAIN (ER-diagram alignment pass) ***
 * Two more fire-and-forget calls added after a successful upsert:
 *   - activityLogService.logActivity() writes an "Location Updated"
 *     ActivityLog entry, matching the example row on slide 8.
 *   - vendorSessionService.touchLastActive() keeps VendorSession.LastActive
 *     fresh if a session already exists. Deliberately does NOT create a
 *     session or gate the location update on consent - see that
 *     service's comments for why.
 * Both are best-effort and cannot fail the request.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import VendorLocation from '../models/VendorLocation.js';
import Vendor from '../models/Vendor.js';
import { toApproximateGeoPoint } from '../utils/geoPrivacy.js';
import { matchAndNotifyResidents } from '../services/proximityWorker.js';
import { logActivity } from '../services/activityLogService.js';
import { touchLastActive } from '../services/vendorSessionService.js';

const LOCATION_TTL_MINUTES = parseInt(process.env.LOCATION_TTL_MINUTES, 10) || 30;

/**
 * POST /api/vendors/:vendorId/location
 * Body: { latitude: number, longitude: number }
 */
export async function updateVendorLocation(req, res) {
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

    const vendorExists = await Vendor.exists({ _id: vendorId });
    if (!vendorExists) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Privacy step: truncate raw coordinates BEFORE anything touches the DB.
    const geoPoint = toApproximateGeoPoint(latitude, longitude);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCATION_TTL_MINUTES * 60 * 1000);

    const updatedLocation = await VendorLocation.findOneAndUpdate(
      { Vendor_ID: vendorId },
      {
        Vendor_ID: vendorId,
        geo: geoPoint,
        UpdatedAt: now,
        ExpiresAt: expiresAt, // refreshes the TTL countdown
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await Vendor.updateOne({ _id: vendorId }, { $set: { Status: 'ACTIVE' } });

    // Fire-and-forget: keep VendorSession.LastActive fresh (no-ops if no
    // session exists yet) and write the ActivityLog entry matching slide
    // 8's example row. Neither can fail the response - both already
    // swallow their own errors internally.
    touchLastActive(vendorId);
    logActivity(vendorId, 'Location Updated', `Lat/Lng updated to ${geoPoint.coordinates[1]}, ${geoPoint.coordinates[0]}`);

    // Respond to the caller (WhatsApp webhook layer) immediately - don't
    // make the vendor's location ping wait on the full resident-matching
    // + push-notification pass, which can take longer as the resident
    // base grows. Errors inside the worker are already caught internally
    // and logged, so this fire-and-forget is safe.
    matchAndNotifyResidents(vendorId, geoPoint)
      .then((summary) => {
        console.log(
          `[locationController] Proximity pass for vendor ${vendorId}:`,
          JSON.stringify(summary)
        );
      })
      .catch((err) => {
        // Belt-and-suspenders - matchAndNotifyResidents already catches
        // its own errors internally, but this ensures an unhandled
        // rejection can never surface from a fire-and-forget call.
        console.error('[locationController] Proximity pass failed unexpectedly:', err);
      });

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
