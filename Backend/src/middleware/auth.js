import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';
import Resident from '../models/Resident.js';
import { getAuth } from '../config/firebaseAdmin.js';

// Verify JWT token and attach admin user to request
export async function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({
        success: false,
        message: 'Missing or Malformed Authorization header',
      });

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[AUTH] JWT_SECRET is not configured');
      return res.status(500).json({
        success: false,
        message: 'Server authorization misconfiguration',
      });
    }

    const decoded = jwt.verify(token, secret);

    const admin = await AdminUser.findById(decoded.adminId).select('Email Role').lean();
    if (!admin || !['SUPER_ADMIN', 'OPERATIONS', 'SUPPORT'].includes(admin.Role))
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });

    req.admin = {
      adminId: admin._id.toString(),
      email: admin.Email,
      role: admin.Role,
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, message: 'Session expired, Login again' });
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
    });
  }
}

// Role-based access control middleware
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Not Authenticated' });
    }
    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    return next();
  };
}

// Verify Firebase token and attach resident to request
export async function requireResidentAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or Malformed Authorization header',
      });
    }

    const token = authHeader.split(' ')[1];
    const firebaseAuth = getAuth();

    if (!firebaseAuth) {
      console.error('[AUTH] Firebase Admin not initialized');
      return res.status(500).json({
        success: false,
        message: 'Server authentication misconfiguration',
      });
    }

    const decodedToken = await firebaseAuth.verifyIdToken(token);

    req.residentFirebaseUid = decodedToken.uid;
    req.residentFirebaseClaims = decodedToken;
    return next();
  } catch (err) {
    console.error('[authMiddleware.requireResidentAuth]', err);
    return res.status(401).json({
      success: false,
      message: 'Invalid Firebase token',
    });
  }
}

// Attach resident document to request from Firebase UID
export async function attachResident(req, res, next) {
  try {
    const resident = await Resident.findOne({ FirebaseUID: req.residentFirebaseUid });

    if (!resident) {
      return res.status(404).json({ success: false, message: 'No resident account found for this session - call /auth/sync first' });
    }

    req.resident = resident;
    return next();
  } catch (err) {
    console.error('[authMiddleware.attachResident]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Ensure resident can only act on their own account
export function requireOwnResident(req, res, next) {
  const { residentId } = req.params;

  if (residentId && residentId !== String(req.resident._id)) {
    return res.status(403).json({ success: false, message: 'Cannot act on another resident\'s account' });
  }

  return next();
}
