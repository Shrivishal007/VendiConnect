/**
 * controllers/adminController.js  *** NEW THIS WEEK ***
 * -----------------------------------------------------------------------
 * POST /api/admin/login          - bcrypt + JWT authentication
 * GET  /api/admin/dashboard      - protected, returns basic system analytics
 * -----------------------------------------------------------------------
 */

import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';
import Vendor from '../models/Vendor.js';
import Resident from '../models/Resident.js';
import Alert from '../models/Alert.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * POST /api/admin/login
 * Body: { email, password }
 *
 * Generic "Invalid credentials" message is used for BOTH "no such
 * email" and "wrong password" cases, deliberately - distinguishing them
 * in the response would let an attacker enumerate valid admin emails.
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // PasswordHash has `select: false` on the schema - opt in explicitly.
    const admin = await AdminUser.findOne({ Email: email.toLowerCase().trim() }).select(
      '+PasswordHash'
    );

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[adminController.login] JWT_SECRET is not configured');
      return res.status(500).json({ success: false, message: 'Server auth misconfiguration' });
    }

    const token = jwt.sign(
      {
        adminId: admin._id.toString(),
        email: admin.Email,
        role: admin.Role,
      },
      secret,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      data: {
        token,
        expiresIn: JWT_EXPIRES_IN,
        admin: { email: admin.Email, role: admin.Role },
      },
    });
  } catch (err) {
    console.error('[adminController.login]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * GET /api/admin/dashboard
 * Protected by middleware/authMiddleware.requireAdminAuth.
 *
 * Returns a snapshot of basic system analytics: active vendor count,
 * total registered residents, and the most recent alerts fired.
 * Deliberately kept to cheap countDocuments()/find().limit() calls
 * rather than heavier aggregations, since this is likely to be polled
 * frequently by the dashboard UI.
 */
export async function getDashboard(req, res) {
  try {
    const [totalActiveVendors, totalResidents, recentAlerts] = await Promise.all([
      Vendor.countDocuments({ Status: 'ACTIVE' }),
      Resident.countDocuments({}),
      Alert.find({})
        .sort({ Timestamp: -1 })
        .limit(10)
        .populate({ path: 'Vendor_ID', select: 'VendorName' })
        .populate({ path: 'Resident_ID', select: 'DisplayName' })
        .lean(),
    ]);

    const formattedRecentAlerts = recentAlerts.map((alert) => ({
      alertId: alert._id,
      vendorName: alert.Vendor_ID?.VendorName || 'Unknown vendor',
      residentName: alert.Resident_ID?.DisplayName || 'Unknown resident',
      etaMinutes: alert.EtaMinutes,
      distanceAtAlertKm: alert.DistanceAtAlert,
      timestamp: alert.Timestamp,
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalActiveVendors,
        totalResidents,
        recentAlerts: formattedRecentAlerts,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[adminController.getDashboard]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
