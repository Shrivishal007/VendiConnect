import { ingestVendorLocation, LocationIngestError } from '../services/locationService.js';
import { matchAndNotifyResidents } from '../services/proximityWorker.js';

// Process a vendor location update and trigger background proximity matching
export async function updateVendorLocation(req, res) {
  try {
    const { vendorId } = req.params;
    const { latitude, longitude } = req.body || {};

    const updatedLocation = await ingestVendorLocation(vendorId, latitude, longitude);

    // Match nearby residents and send notifications without delaying the response
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
    // Return the status code for known location-ingestion errors
    if (err instanceof LocationIngestError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }

    // Log unexpected errors and return a generic response
    console.error('[locationController.updateVendorLocation]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
