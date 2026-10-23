import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';

// List alerts for admin with pagination and filtering
export async function listAlerts(req, res) {
  try {
    const { vendorId, residentId } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    // Build filters based on the provided IDs
    const match = {};
    if (vendorId) {
      if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        return res.status(400).json({ success: false, message: 'Invalid vendorId' });
      }
      match.Vendor_ID = vendorId;
    }
    if (residentId) {
      if (!mongoose.Types.ObjectId.isValid(residentId)) {
        return res.status(400).json({ success: false, message: 'Invalid residentId' });
      }
      match.Resident_ID = residentId;
    }

    // Fetch paginated alerts and total count concurrently
    const [alerts, total] = await Promise.all([
      Alert.find(match)
        .populate({ path: 'Vendor_ID', select: 'Name' })
        .populate({ path: 'Resident_ID', select: 'Name' })
        .sort({ Timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Alert.countDocuments(match),
    ]);

    // Format alerts for the API response
    const data = alerts.map((alert) => ({
      Alert_ID: alert._id,
      VendorName: alert.Vendor_ID?.Name || 'Unknown vendor',
      ResidentName: alert.Resident_ID?.Name || 'Unknown resident',
      EtaMinutes: alert.EtaMinutes,
      DistanceAt: alert.DistanceAt,
      Timestamp: alert.Timestamp,
    }));

    // Return alerts along with pagination metadata
    return res.status(200).json({ success: true, data, meta: buildPageMeta({ page, limit, total }) });
  } catch (err) {
    console.error('[adminAlertController.listAlerts]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
