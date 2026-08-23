const User = require('../models/User');
const authService = require('../services/authService');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/v1/users
 */
const getUsers = async (req, res, next) => {
  try {
    const query = { isActive: true };

    // Search by name or email
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('name email avatar role')
      .sort({ name: 1 })
      .skip((req.pagination.page - 1) * req.pagination.limit)
      .limit(req.pagination.limit);

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      pagination: {
        page: req.pagination.page,
        limit: req.pagination.limit,
        total,
        totalPages: Math.ceil(total / req.pagination.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/me
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/users/me
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'avatar'];
    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      throw new AppError('No valid fields to update.', 400, 'NO_UPDATES');
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/users/me/password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user._id, currentPassword, newPassword);

    res.json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getProfile, updateProfile, changePassword };
