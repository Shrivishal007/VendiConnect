import mongoose from 'mongoose';
import Resident from '../models/Resident.js';
import Preferences from '../models/Preferences.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';

// List residents with search and pagination
export async function listResidents(req, res) {
  try {
    const { q } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const match = {};
    if (q) {
      const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.Name = { $regex: escaped, $options: 'i' };
    }

    const [residents, total] = await Promise.all([
      Resident.find(match)
        .select('Name Address Latitude Longitude NotificationRadius createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Resident.countDocuments(match),
    ]);

    return res.status(200).json({ success: true, data: residents, meta: buildPageMeta({ page, limit, total }) });
  } catch (err) {
    console.error('[adminResidentController.listResidents]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Get resident details with preferences
export async function getResidentDetail(req, res) {
  try {
    const { residentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(residentId)) {
      return res.status(400).json({ success: false, message: 'Invalid residentId' });
    }

    const resident = await Resident.findById(residentId)
      .select('Name Address Latitude Longitude NotificationRadius createdAt')
      .lean();

    if (!resident) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

    const preferences = await Preferences.find({ Resident_ID: residentId })
      .populate({ path: 'Category_ID', select: 'Name' })
      .lean();

    return res.status(200).json({
      success: true,
      data: { resident, preferredCategories: preferences.map((p) => p.Category_ID).filter(Boolean) },
    });
  } catch (err) {
    console.error('[adminResidentController.getResidentDetail]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
