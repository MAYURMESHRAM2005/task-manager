const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../validators/authValidators');
const { authLimiter } = require('../middleware/rateLimiter');
const env = require('../config/env');

// Skip rate limiting in test environment
const limiter = env.NODE_ENV === 'test' ? [] : [authLimiter];

router.post('/register', ...limiter, validateRegister, authController.register);
router.post('/login', ...limiter, validateLogin, authController.login);
router.post('/refresh', ...limiter, authController.refreshToken);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
