/**
 * Role-based access control middleware
 * Must be used after authenticate middleware
 */

// Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        error: { code: 'NOT_AUTHENTICATED' },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
        error: { code: 'INSUFFICIENT_PERMISSIONS' },
      });
    }

    next();
  };
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.',
      error: { code: 'ADMIN_REQUIRED' },
    });
  }
  next();
};

// Check if user is manager or admin
const isManagerOrAdmin = (req, res, next) => {
  if (!req.user || !['MANAGER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Manager or Admin access required.',
      error: { code: 'MANAGER_OR_ADMIN_REQUIRED' },
    });
  }
  next();
};

module.exports = { authorize, isAdmin, isManagerOrAdmin };
