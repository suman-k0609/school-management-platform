/**
 * Health, Readiness, and Observability Controller
 * Implements Kubernetes-style liveness (/health) and readiness (/ready) checks,
 * plus a structured metrics endpoint (/metrics).
 */
const { isHealthy } = require('../db');
const { getMetrics } = require('../middleware/requestLogger');
const config = require('../config/env');

const startTime = Date.now();

async function getHealth(req, res) {
  // Liveness probe: returns 200 as long as the process is alive and event loop is running
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    status: 'UP',
    service: config.serviceName,
    version: config.version,
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
}

async function getReadiness(req, res) {
  // Readiness probe: verifies that downstream dependencies (e.g. PostgreSQL database) are responsive
  const dbHealth = await isHealthy();

  if (dbHealth.healthy) {
    return res.status(200).json({
      status: 'READY',
      service: config.serviceName,
      database: dbHealth,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(503).json({
    status: 'NOT_READY',
    service: config.serviceName,
    database: dbHealth,
    timestamp: new Date().toISOString(),
    troubleshooting:
      'Database connection failed. Ensure PostgreSQL container is running and credentials match DB_USER/DB_PASSWORD.',
  });
}

async function getMetricsReport(req, res) {
  const metrics = getMetrics();
  res.status(200).json({
    service: config.serviceName,
    version: config.version,
    timestamp: new Date().toISOString(),
    ...metrics,
  });
}

module.exports = {
  getHealth,
  getReadiness,
  getMetricsReport,
};
