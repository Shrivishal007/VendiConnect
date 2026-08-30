import VendorLocation from '../models/VendorLocation.js';
import { sanitizeIncomingPing } from '../utils/coordinateSanitizer.js';

export async function validateCoordinates(req, res, next) {
  try {
    const { vendorId } = req.params;
    const { latitude, longitude } = req.body;

    let previousPing = null;
    if (vendorId) {
      const lastLocation = await VendorLocation.findOne({ Vendor_ID: vendorId })
        .select('geo UpdatedAt')
        .lean();

      if (lastLocation) {
        previousPing = {
          latitude: lastLocation.geo.coordinates[1],
          longitude: lastLocation.geo.coordinates[0],
          timestamp: lastLocation.UpdatedAt,
        };
      }
    }

    const result = sanitizeIncomingPing({
      latitude,
      longitude,
      previousPing,
      timestamp: new Date(),
    });

    if (!result.valid) {
      return res.status(422).json({
        success: false,
        message: 'GPS ping rejected by edge-case validation',
        reason: result.reason,
      });
    }

    return next();
  } catch (err) {
    console.error('[validateCoordinates]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
