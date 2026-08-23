const env = require('../config/env');

/**
 * Custom API Error class
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'ERROR';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(messages.join('. '), 422, 'VALIDATION_ERROR');
};

/**
 * Handle Mongoose duplicate key errors
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value '${value}' for field '${field}'. Please use another value.`;
  return new AppError(message, 409, 'DUPLICATE_KEY');
};

/**
 * Handle Mongoose cast errors (invalid ObjectId)
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
};

const handleJWTExpiredError = () => {
  return new AppError('Token expired. Please log in again.', 401, 'TOKEN_EXPIRED');
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, _next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error in non-test environments
  if (env.NODE_ENV !== 'test') {
    console.error('Error:', {
      message: err.message,
      statusCode: err.statusCode,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = handleCastError(err);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }
  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: error.message || 'Internal server error',
    error: {
      code: error.code || 'INTERNAL_ERROR',
    },
  };

  // Don't expose stack traces in production
  if (env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = { errorHandler, AppError };
