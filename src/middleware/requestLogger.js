/**
 * Request Logger & Tracing Middleware
 * Assigns or propagates a correlation ID (x-request-id) and emits structured JSON access logs.
 */
const crypto = require('crypto');
const logger = require('../config/logger');

// Simple in-memory metrics collector for the stretch goal (/metrics)
const metrics = {
  totalRequests: 0,
  requestsByMethod: {},
  requestsByStatus: {},
  requestDurationSum: 0,
  startTime: Date.now(),
};

function requestLoggerMiddleware(req, res, next) {
  // Extract or generate Request / Correlation ID
  const correlationId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = correlationId;
  res.setHeader('X-Request-ID', correlationId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Track metrics
    metrics.totalRequests++;
    metrics.requestsByMethod[req.method] = (metrics.requestsByMethod[req.method] || 0) + 1;
    metrics.requestsByStatus[status] = (metrics.requestsByStatus[status] || 0) + 1;
    metrics.requestDurationSum += duration;

    // Emit structured log
    const meta = {
      requestId: correlationId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: status,
      durationMs: duration,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent') || 'unknown',
      userId: req.user ? req.user.id : undefined,
    };

    if (status >= 500) {
      logger.error(`HTTP ${req.method} ${meta.path} ${status} - ${duration}ms`, meta);
    } else if (status >= 400) {
      logger.warn(`HTTP ${req.method} ${meta.path} ${status} - ${duration}ms`, meta);
    } else {
      logger.info(`HTTP ${req.method} ${meta.path} ${status} - ${duration}ms`, meta);
    }
  });

  next();
}

function getMetrics() {
  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);
  const avgDuration =
    metrics.totalRequests > 0 ? (metrics.requestDurationSum / metrics.totalRequests).toFixed(2) : 0;

  return {
    uptimeSeconds,
    totalRequests: metrics.totalRequests,
    requestsByMethod: metrics.requestsByMethod,
    requestsByStatus: metrics.requestsByStatus,
    averageLatencyMs: parseFloat(avgDuration),
    memoryUsage: process.memoryUsage(),
  };
}

module.exports = {
  requestLoggerMiddleware,
  getMetrics,
};
