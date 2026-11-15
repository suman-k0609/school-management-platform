/**
 * Health & Observability Routes
 * Serves /health, /ready, /metrics, and the School Management Platform UI at /
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { getHealth, getReadiness, getMetricsReport } = require('../controllers/healthController');
const config = require('../config/env');

const router = express.Router();

const dashboardHtmlPath = path.join(__dirname, '../views/dashboard.html');
let dashboardHtml = '';

try {
  dashboardHtml = fs.readFileSync(dashboardHtmlPath, 'utf8');
} catch {
  // Fallback in case of path resolution variance
  dashboardHtml =
    '<!DOCTYPE html><html><body><h1>School Management Platform</h1><p>Dashboard loading error</p></body></html>';
}

// Root route: provides interactive UI in browsers, JSON overview for API clients
router.get('/', (req, res) => {
  const acceptsHtml = req.accepts('html', 'json') === 'html';

  if (!acceptsHtml) {
    return res.status(200).json({
      name: 'School Management Platform API',
      description:
        'DevOps & Cloud Engineering Platform for Student, Class, and Attendance Management',
      version: config.version,
      status: 'UP',
      endpoints: {
        health: '/health',
        readiness: '/ready',
        metrics: '/metrics',
        classes: `${config.apiPrefix}/classes`,
        attendance: `${config.apiPrefix}/attendance`,
        auditLogs: `${config.apiPrefix}/audit-logs`,
      },
      documentation: 'https://github.com/suman-k0609/school-management-platform',
    });
  }

  // Prevent browser caching so updates reflect immediately
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  // Always read from file during development so any template changes reflect without restarting
  try {
    const freshHtml = fs.readFileSync(dashboardHtmlPath, 'utf8');
    return res.send(freshHtml);
  } catch {
    return res.send(dashboardHtml);
  }
});

router.get('/health', getHealth);
router.get('/ready', getReadiness);
router.get('/metrics', getMetricsReport);

module.exports = router;
