/**
 * controllers/residentController.js
 * -----------------------------------------------------------------------
 * Resident registration and login.
 * -----------------------------------------------------------------------
 */

import Resident from '../models/Resident.js';

/**
 * POST /api/residents/register
 * Body: { name, phone, area, flat }
 */
export const registerResident = async (req, res) => {
  try {
    const { name, phone, area, flat, latitude, longitude } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required.' });
    }

    // Normalize phone: strip +, spaces, ensure starts with 91
    const normalized = String(phone).replace(/\D/g, '');
    const fullPhone = normalized.startsWith('91') ? normalized : `91${normalized}`;

    // Check if already registered
    const existing = await Resident.findOne({ Phone: fullPhone });
    if (existing) {
      if (latitude && longitude) {
        existing.Latitude = latitude;
        existing.Longitude = longitude;
        await existing.save();
      }
      return res.status(200).json({
        success: true,
        message: 'Already registered — logged in.',
        data: existing,
        isNew: false,
      });
    }

    const resident = await Resident.create({
      Name: name.trim(),
      Phone: fullPhone,
      Area: (area || 'GPS Detected Area').trim(),
      Flat: (flat || '').trim(),
      Latitude: latitude || 13.0835,
      Longitude: longitude || 80.2720,
    });

    return res.status(201).json({ success: true, data: resident, isNew: true });
  } catch (err) {
    if (err.code === 11000) {
      // Race condition duplicate — just return existing
      const existing = await Resident.findOne({ Phone: req.body.phone });
      return res.status(200).json({ success: true, data: existing, isNew: false });
    }
    console.error('[residentController.register]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * POST /api/residents/login
 * Body: { phone }
 * Returns resident profile if found, 404 if not registered.
 */
export const loginResident = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone is required.' });

    const normalized = String(phone).replace(/\D/g, '');
    const fullPhone = normalized.startsWith('91') ? normalized : `91${normalized}`;

    const resident = await Resident.findOne({
      $or: [{ Phone: fullPhone }, { Phone: normalized }]
    });
    if (!resident) {
      return res.status(404).json({ success: false, message: 'Not registered. Please sign up first.' });
    }

    return res.status(200).json({ success: true, data: resident });
  } catch (err) {
    console.error('[residentController.login]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * GET /api/residents
 * Returns all residents (admin use only).
 */
export const getAllResidents = async (req, res) => {
  try {
    const residents = await Resident.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: residents, count: residents.length });
  } catch (err) {
    console.error('[residentController.getAll]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
