// src/middlewares/authMiddleware.js
import { AuthService } from '../services/authService.js';

/**
 * Middleware to verify a user's signed JWT token.
 * Extracts user info and maps it to req.user.
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = AuthService.verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Invalid or expired token.'
    });
  }

  // Attach decoded token contents (id, email, role) to request
  req.user = decoded;
  next();
};

export const protect = verifyToken;

/**
 * Middleware guard to restrict access to administrator accounts only.
 */
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. User context is missing.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Admin privileges are required to access this resource.'
    });
  }

  next();
};

/**
 * Middleware guard to restrict access to employees or admins.
 */
export const isEmployee = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. User context is missing.'
    });
  }

  if (req.user.role !== 'employee' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Employee or Admin privileges are required to access this resource.'
    });
  }

  next();
};

/**
 * Factory middleware to authorize access to specific roles.
 * @param {string[]} allowedRoles - List of authorized roles (e.g. ['admin', 'employee']).
 */
export const authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User context is missing.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. One of the following roles is required: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
};
