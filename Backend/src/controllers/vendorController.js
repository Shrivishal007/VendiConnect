import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';
import Location from '../models/Location.js';
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
      .select('Name Category_ID AvgRating')
      .limit(limit)
      .lean();

    if (vendors.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const vendorIds = vendors.map((v) => v._id);

    // Fetch all matching locations in one query instead of querying each vendor separately.
    const locations = await Location.find({ Vendor_ID: { $in: vendorIds } })
      .select('Vendor_ID geo')
      .lean();

    const geoByVendorId = new Map(locations.map((loc) => [String(loc.Vendor_ID), loc]));

    const data = vendors.map((vendor) => {
      const location = geoByVendorId.get(String(vendor._id)) || null;
      return {
        VendorName: vendor.Name,
        Category_ID: vendor.Category_ID,
        AvgRating: vendor.AvgRating,
        geo: location?.geo || null,
        status: computeVendorStatus(vendor, location),
      };
    });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[vendorController.getActiveVendorsSummary]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
