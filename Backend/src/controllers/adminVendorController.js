import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';
import Location from '../models/Location.js';
import Sessions from '../models/Sessions.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';

const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

// List vendors with filtering and pagination
export async function listVendors(req, res) {
  try {
    const { status, category, q } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const match = {};
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }
      match.Status = status;
    }
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ success: false, message: 'Invalid category id' });
      }
      match.Category_ID = category;
    }
    if (q) {
      match.Name = { $regex: String(q).trim(), $options: 'i' };
    }

    const [vendors, total] = await Promise.all([
      Vendor.find(match)
        .populate({ path: 'Category_ID', select: 'Name' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Vendor.countDocuments(match),
    ]);

    const vendorIds = vendors.map((v) => v._id);
    const [locations, sessions] = await Promise.all([
      Location.find({ Vendor_ID: { $in: vendorIds } }).select('Vendor_ID UpdatedAt ExpiresAt').lean(),
      Sessions.find({ Vendor_ID: { $in: vendorIds } }).select('Vendor_ID Consent Status').lean(),
    ]);
    const locationByVendor = new Map(locations.map((l) => [String(l.Vendor_ID), l]));
    const sessionByVendor = new Map(sessions.map((s) => [String(s.Vendor_ID), s]));

    const data = vendors.map((vendor) => ({
      Vendor_ID: vendor._id,
      VendorName: vendor.Name,
      Vehicle: vendor.Vehicle,
      Status: vendor.Status,
      Category: vendor.Category_ID ? { Category_ID: vendor.Category_ID._id, Name: vendor.Category_ID.Name } : null,
      AvgRating: vendor.AvgRating,
      RatingCount: vendor.RatingCount,
      RegisteredAt: vendor.createdAt,
      LastLocationUpdate: locationByVendor.get(String(vendor._id))?.UpdatedAt || null,
      ConsentStatus: sessionByVendor.get(String(vendor._id))?.Status || 'NOT_STARTED',
    }));

    return res.status(200).json({ success: true, data, meta: buildPageMeta({ page, limit, total }) });
  } catch (err) {
    console.error('[adminVendorController.listVendors]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Get vendor details with location and session info
export async function getVendorDetail(req, res) {
  try {
    const { vendorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    const vendor = await Vendor.findById(vendorId).populate({ path: 'Category_ID', select: 'Name' }).lean();
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const [location, session] = await Promise.all([
      Location.findOne({ Vendor_ID: vendorId }).lean(),
      Sessions.findOne({ Vendor_ID: vendorId }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: { vendor, location: location || null, session: session || null },
    });
  } catch (err) {
    console.error('[adminVendorController.getVendorDetail]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Update vendor status
export async function updateVendorStatus(req, res) {
  try {
    const { vendorId } = req.params;
    const { status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }

    const vendor = await Vendor.findByIdAndUpdate(vendorId, { $set: { Status: status } }, { returnDocument: 'after' });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const actor = req.admin?.email || 'unknown-admin';
    console.log(`[adminVendorController] Status changed for vendor ${vendorId} to ${status} by ${actor}`);

    return res.status(200).json({ success: true, message: 'Vendor status updated', data: { Vendor_ID: vendor._id, Status: vendor.Status } });
  } catch (err) {
    console.error('[adminVendorController.updateVendorStatus]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
