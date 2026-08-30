import mongoose from 'mongoose';
import { checkAndThrottleAlert } from '../services/alertService.js';

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

    return res.status(201).json({ success: true, allowed: true, data: alert });
  } catch (err) {
    console.error('[alertController.createAlert]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
