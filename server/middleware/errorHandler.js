const ApiError = require('../utils/ApiError');

/**
 * Global Express error-handling middleware.
 * Handles Mongoose validation errors, cast errors, duplicate-key errors,
 * custom ApiErrors, and unknown errors.
 *
 * Always responds with { success: false, message }.
 *
 * @function errorHandler
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal server error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join('. ');
  }
  // Mongoose bad ObjectId / CastError
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  // MongoDB duplicate key error
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue).join(', ');
    message = `Duplicate value for: ${field}`;
  }
  // Custom operational ApiError
  else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // Any other error with a message
  else if (err.message) {
    message = err.message;
  }

  // Log in development for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = { errorHandler };
