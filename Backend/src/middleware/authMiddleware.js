/**
 * middleware/authMiddleware.js  *** NEW THIS WEEK ***
 * -----------------------------------------------------------------------
 * Verifies the `Authorization: Bearer <token>` header on protected admin
 * routes (e.g. GET /api/admin/dashboard). On success, attaches the
 * decoded payload to req.admin for downstream controllers to use
 * (e.g. role-based checks).
 * -----------------------------------------------------------------------
 */

import jwt from 'jsonwebtoken';

/**
 * Express middleware: requires a valid JWT issued by adminController.login().
 */
export function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Fail closed, not open - an unconfigured secret should never
      // silently let requests through.
      console.error('[authMiddleware] JWT_SECRET is not configured');
      return res.status(500).json({ success: false, message: 'Server auth misconfiguration' });
    }

    const decoded = jwt.verify(token, secret);

    // decoded = { adminId, email, role, iat, exp }
    req.admin = decoded;

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
    }
    return res.status(401).json({ success: false, message: 'Invalid authentication token' });
  }
}

/**
 * Optional role-gate factory: requireAdminAuth must run first so
 * req.admin is populated. Usage: router.get('/x', requireAdminAuth, requireRole('SUPER_ADMIN'), handler)
 * @param {...string} allowedRoles
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    return next();
  };
}
