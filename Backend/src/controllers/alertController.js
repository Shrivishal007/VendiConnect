/**
 * controllers/alertController.js
 * -----------------------------------------------------------------------
 * Handles proactive alerts and Doorbell Stop Alerts.
 * All alerts are stored directly in MongoDB Atlas.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import { checkAndThrottleAlert } from '../services/alertService.js';

/**
 * GET /api/alerts
 * Returns the most recent alerts from MongoDB Atlas for the Admin Dashboard.
 */
export async function getAllAlerts(req, res) {
  try {
    const alerts = await Alert.find({})
      .sort({ Timestamp: -1, createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (err) {
    console.error('[alertController.getAllAlerts]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * POST /api/alerts
 * Creates a Doorbell Stop Alert requested by a resident and stores it in MongoDB.
 * Body: { vendorId, residentId, residentName, vendorName, type, etaMinutes, distanceKm }
 */
export async function createDoorbellAlert(req, res) {
  try {
    const {
      vendorId,
      residentId,
      residentName,
      vendorName,
      type,
      etaMinutes,
      distanceKm,
    } = req.body;

    const alert = await Alert.create({
      Vendor_ID: vendorId || null,
      Resident_ID: residentId || null,
      ResidentName: residentName || 'Resident (Flat 4A)',
      VendorName: vendorName || 'Vendor Cart',
      Type: type || 'Doorbell Stop Alert',
      Status: 'DISPATCHED',
      Timestamp: new Date(),
      EtaMinutes: Number(etaMinutes) || 2,
      DistanceAtAlert: Number(distanceKm) || 0.15,
    });

    return res.status(201).json({
      success: true,
      message: 'Doorbell stop alert recorded in MongoDB.',
      data: alert,
    });
  } catch (err) {
    console.error('[alertController.createDoorbellAlert]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * POST /api/alerts/throttle-check
 * Body: { vendorId, residentId, etaMinutes, distanceKm }
 */
export async function createAlert(req, res) {
  try {
    const { vendorId, residentId, etaMinutes, distanceKm } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(vendorId) ||
      !mongoose.Types.ObjectId.isValid(residentId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Valid vendorId and residentId are required' });
    }

    if (
      !Number.isFinite(etaMinutes) ||
      !Number.isFinite(distanceKm) ||
      etaMinutes < 0 ||
      distanceKm < 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'etaMinutes and distanceKm must be valid non-negative numbers' });
    }

    const { allowed, alert } = await checkAndThrottleAlert(
      vendorId,
      residentId,
      etaMinutes,
      distanceKm
    );

    if (!allowed) {
      return res.status(200).json({
        success: true,
        allowed: false,
        message: 'Alert suppressed - resident was already notified about this vendor recently',
      });
    }

    return res.status(201).json({
      success: true,
      allowed: true,
      data: alert,
    });
  } catch (err) {
    console.error('[alertController.createAlert]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export default createAlert;
