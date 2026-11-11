/**
 * Health & Observability Routes
 */
const express = require('express');
const { getHealth, getReadiness, getMetricsReport } = require('../controllers/healthController');

const router = express.Router();

router.get('/health', getHealth);
router.get('/ready', getReadiness);
router.get('/metrics', getMetricsReport);

module.exports = router;
