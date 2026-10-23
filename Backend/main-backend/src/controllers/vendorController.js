import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';
import Location from '../models/Location.js';
import Sessions from '../models/Sessions.js';
import { computeVendorStatus } from '../utils/vendorStatus.js';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

// Get a summary of active vendors, optionally filtered by category.
export async function getActiveVendorsSummary(req, res) {
  try {
    const { category } = req.query;

    if (category && !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category id' });
    }

    // Apply a default limit and cap requests to prevent oversized queries.
    const requestedLimit = parseInt(req.query.limit, 10);
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const match = { Status: 'ACTIVE' };
    if (category) {
      match.Category_ID = category;
    }

    const vendors = await Vendor.find(match)
      .select('Name Category_ID AvgRating Vehicle')
      .limit(limit)
      .lean();

    if (vendors.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const vendorIds = vendors.map((v) => v._id);

    // Fetch locations and consent sessions concurrently
    const [locations, sessions] = await Promise.all([
      Location.find({ Vendor_ID: { $in: vendorIds }, ExpiresAt: { $gt: new Date() } })
        .select('Vendor_ID geo UpdatedAt ExpiresAt')
        .lean(),
      Sessions.find({ Vendor_ID: { $in: vendorIds }, Consent: true, Status: 'ACTIVE' })
        .select('Vendor_ID Consent Status')
        .lean(),
    ]);

    const geoByVendorId = new Map(locations.map((loc) => [String(loc.Vendor_ID), loc]));
    const consentedSet = new Set(sessions.map((s) => String(s.Vendor_ID)));

    const data = vendors
      .map((vendor) => {
        const isConsented = consentedSet.has(String(vendor._id));
        const location = geoByVendorId.get(String(vendor._id)) || null;
        const status = computeVendorStatus(vendor, location, {}, isConsented);

        return {
          Vendor_ID: vendor._id,
          VendorName: vendor.Name,
          Category_ID: vendor.Category_ID,
          Vehicle: vendor.Vehicle,
          AvgRating: vendor.AvgRating,
          geo: location?.geo || null,
          status,
          lastUpdated: location?.UpdatedAt || null,
        };
      })
      .filter((v) => v.status !== 'OFFLINE' && v.status !== 'STALE_SIGNAL');

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[vendorController.getActiveVendorsSummary]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
