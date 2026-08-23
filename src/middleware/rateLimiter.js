const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: env.RATE_LIMIT_MAX || 100,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for auth routes (login, register, refresh)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.AUTH_RATE_LIMIT_MAX || 10,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    error: { code: 'AUTH_RATE_LIMIT_EXCEEDED' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter };
