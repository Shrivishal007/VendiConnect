import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';
import Vendor from '../models/Vendor.js';
import Resident from '../models/Resident.js';
import Alert from '../models/Alert.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATIONS', 'SUPPORT'];

// Email validation helper
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signAdminToken(admin) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      adminId: admin._id.toString(),
      email: admin.Email,
      role: admin.Role,
    },
    secret,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Register a new admin user
export async function register(req, res) {
  try {
    const { email, password, role } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';

    if (!isValidEmail(normalizedEmail) || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'A valid email and a password of at least 8 characters are required',
      });
    }

    if (!ADMIN_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid admin role' });
    }

    const existingAdmin = await AdminUser.exists({ Email: normalizedEmail });
    if (existingAdmin) {
      return res.status(409).json({ success: false, message: 'An admin with this email already exists' });
    }

    const admin = await AdminUser.create({
      Email: normalizedEmail,
      Password: await AdminUser.hashPassword(password),
      Role: role,
    });

    return res.status(201).json({
      success: true,
      data: { admin: { email: admin.Email, role: admin.Role } },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'An admin with this email already exists' });
    }

    console.error('[adminController.register]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Admin login with JWT token
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email?.trim()) || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const admin = await AdminUser.findOne({ Email: email.toLowerCase().trim() }).select(
      '+Password'
    );

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('[adminController.login] JWT_SECRET is not configured');
      return res.status(500).json({ success: false, message: 'Server auth misconfiguration' });
    }

    const token = signAdminToken(admin);

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

// Get dashboard statistics and recent alerts
export async function getDashboard(req, res) {
  try {
    const [totalActiveVendors, totalResidents, recentAlerts] = await Promise.all([
      Vendor.countDocuments({ Status: 'ACTIVE' }),
      Resident.countDocuments({}),
      Alert.find({})
        .sort({ Timestamp: -1 })
        .limit(10)
        .populate({ path: 'Vendor_ID', select: 'Name' })
        .populate({ path: 'Resident_ID', select: 'Name' })
        .lean(),
    ]);

    const formattedRecentAlerts = recentAlerts.map((alert) => ({
      alertId: alert._id,
      vendorName: alert.Vendor_ID?.Name || 'Unknown vendor',
      residentName: alert.Resident_ID?.Name || 'Unknown resident',
      etaMinutes: alert.EtaMinutes,
      distanceAtAlertKm: alert.DistanceAt,
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

// Get current admin profile
export async function getMe(req, res) {
  try {
    // req.admin is the decoded JWT payload set by authMiddleware.requireAdminAuth
    const admin = await AdminUser.findById(req.admin.adminId).select('Email Role createdAt').lean();

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account no longer exists' });
    }

    return res.status(200).json({
      success: true,
      data: { email: admin.Email, role: admin.Role, createdAt: admin.createdAt },
    });
  } catch (err) {
    console.error('[adminController.getMe]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
