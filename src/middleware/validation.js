const mongoose = require('mongoose');

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}: ${id}`,
        error: { code: 'INVALID_ID' },
      });
    }
    next();
  };
};

/**
 * Validate required fields in request body
 */
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = fields.filter((field) => !req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === ''));
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
        error: { code: 'MISSING_FIELDS', fields: missing },
      });
    }
    next();
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  req.pagination = {
    page: Math.max(1, page),
    limit: Math.min(Math.max(1, limit), 100), // Max 100 per page
  };

  next();
};

module.exports = { validateObjectId, validateRequired, validatePagination };
