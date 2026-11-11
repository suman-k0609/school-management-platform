/**
 * Master Router Aggregator
 */
const express = require('express');
const healthRoutes = require('./healthRoutes');
const classRoutes = require('./classRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const auditRoutes = require('./auditRoutes');
const config = require('../config/env');

const router = express.Router();

// Root & Health routes (mounted at top-level)
router.use('/', healthRoutes);

// API v1 namespaced routes
const apiV1Router = express.Router();
apiV1Router.use('/classes', classRoutes);
apiV1Router.use('/attendance', attendanceRoutes);
apiV1Router.use('/audit-logs', auditRoutes);

// Mount under configured API prefix (default: /api/v1)
router.use(config.apiPrefix, apiV1Router);

module.exports = router;
