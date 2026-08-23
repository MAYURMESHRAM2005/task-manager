const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { AppError } = require('../middleware/errorHandler');
const env = require('../config/env');

/**
 * Generate access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  const { v4: uuidv4 } = require('uuid');
  return jwt.sign({ id: userId, jti: uuidv4() }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
};

/**
 * Calculate refresh token expiration date
 */
const getRefreshTokenExpiry = () => {
  const expiry = env.JWT_REFRESH_EXPIRES_IN;
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return new Date(Date.now() + value * multipliers[unit]);
};

/**
 * Register a new user
 */
const register = async (userData, ip, userAgent) => {
  const { name, email, password } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
  }

  // Create user
  const user = await User.create({ name, email, password });

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token
  await RefreshToken.create({
    user: user._id,
    token: refreshToken,
    expiresAt: getRefreshTokenExpiry(),
    userAgent: userAgent || '',
    ipAddress: ip || '',
  });

  return { user, accessToken, refreshToken };
};

/**
 * Login user
 */
const login = async (email, password, ip, userAgent) => {
  // Find user with password
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Contact an administrator.', 403, 'ACCOUNT_DEACTIVATED');
  }

  if (!user.passwordHash) {
    throw new AppError('Account security data is missing. Please register again.', 401, 'MISSING_PASSWORD_HASH');
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token
  await RefreshToken.create({
    user: user._id,
    token: refreshToken,
    expiresAt: getRefreshTokenExpiry(),
    userAgent: userAgent || '',
    ipAddress: ip || '',
  });

  return { user, accessToken, refreshToken };
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (refreshTokenValue) => {
  if (!refreshTokenValue) {
    throw new AppError('Refresh token is required.', 400, 'NO_REFRESH_TOKEN');
  }

  // Verify refresh token JWT
  let decoded;
  try {
    decoded = jwt.verify(refreshTokenValue, env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Check if token exists in database and is not revoked
  const storedToken = await RefreshToken.findOne({
    token: refreshTokenValue,
    user: decoded.id,
    isRevoked: false,
  });

  if (!storedToken) {
    throw new AppError('Refresh token has been revoked or not found.', 401, 'REVOKED_REFRESH_TOKEN');
  }

  // Check expiration
  if (storedToken.expiresAt < new Date()) {
    throw new AppError('Refresh token has expired.', 401, 'EXPIRED_REFRESH_TOKEN');
  }

  // Revoke old refresh token
  storedToken.isRevoked = true;
  await storedToken.save();

  // Generate new tokens
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new AppError('User not found or deactivated.', 401, 'USER_UNAVAILABLE');
  }

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  // Store new refresh token
  await RefreshToken.create({
    user: user._id,
    token: newRefreshToken,
    expiresAt: getRefreshTokenExpiry(),
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Logout - revoke refresh token
 */
const logout = async (refreshTokenValue) => {
  if (refreshTokenValue) {
    await RefreshToken.findOneAndUpdate(
      { token: refreshTokenValue },
      { isRevoked: true }
    );
  }
  return { message: 'Logged out successfully' };
};

/**
 * Change password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  if (!user.passwordHash) {
    throw new AppError('Account security data is missing. Please re-register.', 401, 'MISSING_PASSWORD_HASH');
  }

  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect.', 401, 'INVALID_PASSWORD');
  }

  user.passwordHash = newPassword;
  await user.save();

  // Revoke all refresh tokens for this user
  await RefreshToken.updateMany({ user: userId }, { isRevoked: true });

  return { message: 'Password changed successfully. Please log in again.' };
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  changePassword,
  generateAccessToken,
  generateRefreshToken,
};
