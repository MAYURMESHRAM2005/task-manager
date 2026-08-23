const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

// Protect routes - require valid JWT
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check cookie (if using cookie-based auth)
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        error: { code: 'NO_TOKEN' },
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired.',
          error: { code: 'TOKEN_EXPIRED' },
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        error: { code: 'INVALID_TOKEN' },
      });
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
        error: { code: 'USER_NOT_FOUND' },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.',
        error: { code: 'ACCOUNT_DEACTIVATED' },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
      error: { code: 'AUTH_ERROR' },
    });
  }
};

// Optional authentication - attach user if token is valid, but don't require it
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.isActive) {
          req.user = user;
        }
      } catch {
        // Token invalid, continue without user
      }
    }
    next();
  } catch {
    next();
  }
};

module.exports = { authenticate, optionalAuth };
