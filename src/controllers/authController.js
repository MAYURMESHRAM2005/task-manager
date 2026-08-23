const authService = require('../services/authService');
const auditService = require('../services/auditService');

/**
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.register(
      req.body,
      req.ip,
      req.get('User-Agent')
    );

    await auditService.logActivity({
      userId: user._id,
      action: 'USER_REGISTERED',
      entity: 'Auth',
      entityId: user._id,
      description: `New user registered: ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(
      email,
      password,
      req.ip,
      req.get('User-Agent')
    );

    await auditService.logActivity({
      userId: user._id,
      action: 'USER_LOGGED_IN',
      entity: 'Auth',
      entityId: user._id,
      description: `User logged in: ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: { user, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    const result = await authService.refreshAccessToken(token);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    await auditService.logActivity({
      userId: req.user._id,
      action: 'USER_LOGGED_OUT',
      entity: 'Auth',
      entityId: req.user._id,
      description: `User logged out: ${req.user.email}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    const result = await authService.logout(token);

    res.json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refreshToken, logout };
