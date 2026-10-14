/**
 * controllers/vendorController.js
 * -----------------------------------------------------------------------
 * Handles vendor registration (Week 1/2 scope).
 * Hashes the raw phone number using the same HMAC-SHA256 approach
 * as utils/geoPrivacy.js so lookups from the WhatsApp webhook match.
 * -----------------------------------------------------------------------
 */

import crypto from 'crypto';
import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';
import Category from '../models/Category.js';
import VendorLocation from '../models/VendorLocation.js';

const hashPhoneNumber = (phone) => {
  const secret = process.env.PHONE_HASH_SECRET || 'vendiconnect_default_secret';
  return crypto.createHmac('sha256', secret).update(String(phone).trim()).digest('hex');
};

/**
 * POST /api/vendors/register
 * Body: { vendorName, phone, vehicle, categoryId }
 */
export const registerVendor = async (req, res) => {
  try {
    const { vendorName, phone, vehicle, categoryId } = req.body;

    // --- Validation ---
    if (!vendorName || !phone || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'vendorName, phone, and categoryId are required.',
      });
    }

    const cleanPhone = String(phone).replace(/\D/g, ''); // strip non-digits
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be at least 10 digits (include country code).',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: 'Invalid categoryId.' });
    }

    // --- Check category exists ---
    const categoryExists = await Category.exists({ _id: categoryId });
    if (!categoryExists) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    // --- Hash phone (HMAC-SHA256, matches geoPrivacy.js) ---
    const phoneHash = hashPhoneNumber(cleanPhone);

    // --- Check for duplicate ---
    const duplicate = await Vendor.findOne({ PhoneHash: phoneHash });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'A vendor with this phone number is already registered.',
      });
    }

    // --- Create vendor ---
    const vendor = await Vendor.create({
      VendorName: vendorName.trim(),
      PhoneHash: phoneHash,
      Vehicle: vehicle || 'Pushcart',
      Category_ID: categoryId,
      Status: 'INACTIVE',
    });

    return res.status(201).json({
      success: true,
      message: 'Vendor registered successfully.',
      data: {
        Vendor_ID: vendor._id,
        VendorName: vendor.VendorName,
        Vehicle: vendor.Vehicle,
        Status: vendor.Status,
      },
    });
  } catch (err) {
    console.error('[vendorController.registerVendor]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * GET /api/vendors
 * Returns a list of all registered vendors (basic info, no PhoneHash exposed).
 */
export const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({}, '-PhoneHash')
      .populate('Category_ID', 'Name name')
      .lean();

    // Query live locations from VendorLocation collection
    const vendorIds = vendors.map(v => v._id);
    const locations = await VendorLocation.find({ Vendor_ID: { $in: vendorIds } }).lean();
    const locMap = new Map();
    locations.forEach(loc => {
      if (loc.geo && Array.isArray(loc.geo.coordinates)) {
        locMap.set(String(loc.Vendor_ID), {
          latitude: loc.geo.coordinates[1],
          longitude: loc.geo.coordinates[0],
          updatedAt: loc.UpdatedAt || loc.updatedAt
        });
      }
    });

    // Default coordinates around Anna Nagar sector for vendors without live GPS ping
    const defaultCoords = [
      [13.0827, 80.2707],
      [13.0850, 80.2750],
      [13.0780, 80.2650],
      [13.0900, 80.2720],
      [13.0810, 80.2770],
      [13.0835, 80.2715]
    ];

    const enrichedVendors = vendors.map((v, index) => {
      const loc = locMap.get(String(v._id));
      const fallback = defaultCoords[index % defaultCoords.length];
      const lat = loc ? loc.latitude : fallback[0];
      const lng = loc ? loc.longitude : fallback[1];

      return {
        ...v,
        latitude: lat,
        longitude: lng,
        isLive: v.Status === 'ACTIVE',
        lastLocationUpdate: loc ? loc.updatedAt : v.updatedAt
      };
    });

    return res.status(200).json({ success: true, data: enrichedVendors });
  } catch (err) {
    console.error('[vendorController.getAllVendors]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * PATCH /api/vendors/:vendorId/status
 * Body: { status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }
 * Used by AdminDashboard to suspend or reactivate vendors.
 */
export const updateVendorStatus = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { status } = req.body;

    const ALLOWED = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!ALLOWED.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${ALLOWED.join(', ')}` });
    }

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId.' });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { Status: status } },
      { new: true, select: '-PhoneHash' }
    );

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found.' });
    }

    return res.status(200).json({ success: true, data: vendor });
  } catch (err) {
    console.error('[vendorController.updateVendorStatus]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
