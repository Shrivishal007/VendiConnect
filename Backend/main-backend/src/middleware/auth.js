import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';
import Resident from '../models/Resident.js';
import { getAuth } from '../config/firebaseAdmin.js';
import { requiredEnv } from '../config/env.js';

const JWT_SECRET = requiredEnv('JWT_SECRET');

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
    const decoded = jwt.verify(token, JWT_SECRET);

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

async function verifyFirebaseUser(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Missing or Malformed Authorization header',
      });
      return null;
    }

    const firebaseAuth = getAuth();
    if (!firebaseAuth) {
      console.error('[AUTH] Firebase Admin is not configured');
      res.status(503).json({
        success: false,
        message: 'Firebase Authentication is not configured on the server',
      });
      return null;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    if (
      !decodedToken.uid ||
      !decodedToken.email ||
      decodedToken.firebase?.sign_in_provider !== 'password'
    ) {
      res.status(401).json({ success: false, message: 'A Firebase email/password account is required' });
      return null;
    }

    return decodedToken;
  } catch (err) {
    if (!String(err.code || '').startsWith('auth/')) {
      console.error('[authMiddleware.verifyFirebaseUser]', err);
    }
    res.status(401).json({ success: false, message: 'Invalid Firebase authentication token' });
    return null;
  }
}

export async function requireFirebaseAuth(req, res, next) {
  const claims = await verifyFirebaseUser(req, res);
  if (!claims) return;

  req.residentFirebaseUid = claims.uid;
  req.residentFirebaseClaims = claims;
  return next();
}

// Verify the Firebase token and attach the matching resident profile.
export async function requireResidentAuth(req, res, next) {
  const claims = await verifyFirebaseUser(req, res);
  if (!claims) return;

  try {
    const resident = await Resident.findOne({ FirebaseUID: claims.uid });
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'Resident profile not found. Sign in again to sync your profile.',
      });
    }

    req.residentFirebaseUid = claims.uid;
    req.residentFirebaseClaims = claims;
    req.resident = resident;
    return next();
  } catch (err) {
    console.error('[authMiddleware.requireResidentAuth]', err);
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
