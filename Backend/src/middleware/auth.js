import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';

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
