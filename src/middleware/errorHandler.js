/**
 * Centralized Error Handling Middleware
 * Ensures every error response conforms to a standard schema and logs actionable diagnostics.
 */
const logger = require('../config/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const message = err.message || 'An unexpected internal error occurred';

  // Log error with request context
  logger.error(`Error processing request ${req.id}: ${message}`, {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errorCode,
    stack: err.stack,
  });

  const responseBody = {
    success: false,
    error: {
      code: errorCode,
      message,
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  };

  // Only include details or stack if explicitly safe or development
  if (err.details) {
    responseBody.error.details = err.details;
  }

  res.status(statusCode).json(responseBody);
}

module.exports = errorHandler;
