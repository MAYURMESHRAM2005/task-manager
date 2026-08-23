const { AppError } = require('../middleware/errorHandler');

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  if (!name || name.trim().length > 100) {
    errors.push('Name cannot exceed 100 characters');
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push('Please provide a valid email address');
  }
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  if (password && password.length > 128) {
    errors.push('Password cannot exceed 128 characters');
  }

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      message: errors.join('. '),
      error: { code: 'VALIDATION_ERROR', details: errors },
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      message: errors.join('. '),
      error: { code: 'VALIDATION_ERROR', details: errors },
    });
  }

  next();
};

const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const errors = [];

  if (!currentPassword) errors.push('Current password is required');
  if (!newPassword || newPassword.length < 6) {
    errors.push('New password must be at least 6 characters long');
  }

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      message: errors.join('. '),
      error: { code: 'VALIDATION_ERROR', details: errors },
    });
  }

  next();
};

module.exports = { validateRegister, validateLogin, validateChangePassword };
