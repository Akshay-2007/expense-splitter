/**
 * Custom API Error class that extends the native Error.
 * Carries an HTTP status code and an operational flag for error handling middleware.
 * @class ApiError
 * @extends Error
 */
class ApiError extends Error {
  /**
   * @param {string} message - Human-readable error message.
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 404, 500).
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
