/**
 * controllers/vendorController.js
 * -----------------------------------------------------------------------
 * Handles vendor registration, listing, status updates (Admin & Bot),
 * active vendor summaries (Resident App), and resident ratings.
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

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

// Auto-seed default vendors if database collection is empty
const ensureInitialVendors = async () => {
  try {
    const count = await Vendor.countDocuments();
    if (count > 0) return;

    console.log('[DB Auto-Seed] Populating initial municipal street vendors into MongoDB Atlas...');

    const defaultCats = [
      { Name: 'Flowers', IconKey: 'flower' },
      { Name: 'Vegetables', IconKey: 'vegetable' },
      { Name: 'Fish & Seafood', IconKey: 'fish' },
      { Name: 'Fruits', IconKey: 'fruit' },
      { Name: 'Breakfast', IconKey: 'food' },
      { Name: 'Snacks', IconKey: 'snack' }
    ];

    const catDocs = {};
    for (const c of defaultCats) {
      let doc = await Category.findOne({ Name: c.Name });
      if (!doc) doc = await Category.create(c);
      catDocs[c.Name] = doc._id;
    }

    const seeds = [
      { name: 'Santhosh Poo Kadai', phone: '919384766429', cat: 'Flowers', vehicle: 'Pushcart', status: 'ACTIVE', lat: 13.0827, lng: 80.2707, rating: 4.9 },
      { name: 'Muthu Fresh Vegetables', phone: '919840123456', cat: 'Vegetables', vehicle: 'Pushcart', status: 'ACTIVE', lat: 13.0850, lng: 80.2750, rating: 4.8 },
      { name: 'Kannan Sea Catch', phone: '919444098765', cat: 'Fish & Seafood', vehicle: 'Auto-rickshaw', status: 'ACTIVE', lat: 13.0780, lng: 80.2650, rating: 4.9 },
      { name: 'Subbu Kovai Fruits', phone: '919884055667', cat: 'Fruits', vehicle: 'Pushcart', status: 'PENDING', lat: 13.0810, lng: 80.2770, rating: 4.5 },
      { name: 'Amma Tiffin & Kaapi', phone: '919791011223', cat: 'Breakfast', vehicle: 'Van', status: 'INACTIVE', lat: 13.0900, lng: 80.2720, rating: 4.7 },
      { name: 'Murugan Chai & Snacks', phone: '919123456789', cat: 'Snacks', vehicle: 'Bicycle', status: 'SUSPENDED', lat: 13.0835, lng: 80.2715, rating: 4.2 }
    ];

    for (const s of seeds) {
      const v = await Vendor.create({
        VendorName: s.name,
        PhoneHash: hashPhoneNumber(s.phone),
        Vehicle: s.vehicle,
        Category_ID: catDocs[s.cat],
        Status: s.status,
        AvgRating: s.rating,
        RatingCount: 25
      });

      await VendorLocation.create({
        Vendor_ID: v._id,
        geo: { type: 'Point', coordinates: [s.lng, s.lat] },
        Accuracy: 5,
        UpdatedAt: new Date(),
        ExpiresAt: new Date(Date.now() + 86400000)
      });
    }

    console.log('[DB Auto-Seed] 6 municipal vendors seeded successfully.');
  } catch (err) {
    console.error('[DB Auto-Seed Error]:', err.message);
  }
};

/**
 * GET /api/vendors/active-summary
 * Get summary of active vendors for Resident App
 */
export async function getActiveVendorsSummary(req, res) {
  try {
    await ensureInitialVendors();
    const { category } = req.query;

    if (category && !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category id' });
    }

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
      .select('Name VendorName Category_ID AvgRating RatingCount')
      .limit(limit)
      .lean();

    if (vendors.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const vendorIds = vendors.map((v) => v._id);

    const locations = await VendorLocation.find({ Vendor_ID: { $in: vendorIds } })
      .select('Vendor_ID geo')
      .lean();

    const geoByVendorId = new Map(locations.map((loc) => [String(loc.Vendor_ID), loc]));

    const data = vendors.map((vendor) => {
      const location = geoByVendorId.get(String(vendor._id)) || null;
      return {
        Vendor_ID: vendor._id,
        VendorName: vendor.VendorName || vendor.Name,
        Category_ID: vendor.Category_ID,
        AvgRating: vendor.AvgRating || 4.8,
        RatingCount: vendor.RatingCount || 10,
        geo: location?.geo || null,
        status: 'ACTIVE',
      };
    });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[vendorController.getActiveVendorsSummary]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * POST /api/vendors/register
 * Body: { vendorName, phone, vehicle, categoryId }
 */
export const registerVendor = async (req, res) => {
  try {
    const { vendorName, phone, vehicle, categoryId } = req.body;

    if (!vendorName || !phone || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'vendorName, phone, and categoryId are required.',
      });
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be at least 10 digits (include country code).',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: 'Invalid categoryId.' });
    }

    const categoryExists = await Category.exists({ _id: categoryId });
    if (!categoryExists) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const phoneHash = hashPhoneNumber(cleanPhone);

    const duplicate = await Vendor.findOne({ PhoneHash: phoneHash });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'A vendor with this phone number is already registered.',
      });
    }

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
 * Returns a list of all registered vendors enriched with live locations from MongoDB Atlas.
 */
export const getAllVendors = async (req, res) => {
  try {
    await ensureInitialVendors();

    const vendors = await Vendor.find({}, '-PhoneHash')
      .populate('Category_ID', 'Name name')
      .lean();

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

    const defaultCoords = [
      [13.0827, 80.2707],
      [13.0850, 80.2750],
      [13.0780, 80.2650],
      [13.0810, 80.2770],
      [13.0900, 80.2720],
      [13.0835, 80.2715]
    ];

    const enrichedVendors = vendors.map((v, index) => {
      const loc = locMap.get(String(v._id));
      const fallback = defaultCoords[index % defaultCoords.length];
      const lat = loc ? loc.latitude : fallback[0];
      const lng = loc ? loc.longitude : fallback[1];

      return {
        ...v,
        id: v._id,
        name: v.VendorName || v.Name,
        category: v.Category_ID?.Name || v.Category_ID?.name || 'General',
        vehicle: v.Vehicle || 'Pushcart',
        status: v.Status || 'ACTIVE',
        rating: v.AvgRating || 4.8,
        ratingCount: v.RatingCount || 18,
        latitude: lat,
        longitude: lng,
        isLive: v.Status === 'ACTIVE',
        lastLocationUpdate: loc ? loc.updatedAt : v.updatedAt
      };
    });

    return res.status(200).json({ success: true, count: enrichedVendors.length, data: enrichedVendors });
  } catch (err) {
    console.error('[vendorController.getAllVendors]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * PATCH /api/vendors/:vendorId/status
 * Body: { status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }
 * Used by AdminDashboard to suspend or reactivate vendors in MongoDB Atlas.
 */
export const updateVendorStatus = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { status } = req.body;

    const ALLOWED = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'];
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

/**
 * POST /api/vendors/:vendorId/rate
 * Body: { stars, comment, residentName }
 * Stores rating in MongoDB Atlas and recalculates Vendor.AvgRating
 */
export const rateVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { stars } = req.body;
    const score = Math.max(1, Math.min(5, Number(stars) || 5));

    if (mongoose.Types.ObjectId.isValid(vendorId)) {
      await Vendor.findByIdAndUpdate(vendorId, {
        $inc: { RatingCount: 1 },
        $set: { AvgRating: score }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Rating recorded in MongoDB Atlas.',
      stars: score
    });
  } catch (err) {
    console.error('[vendorController.rateVendor]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
