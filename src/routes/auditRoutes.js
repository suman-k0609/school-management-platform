/**
 * Audit Log Routes
 */
const express = require('express');
const { listAuditLogs } = require('../controllers/auditController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Only teachers and admins can view the audit trail
router.get('/', requireRole(['admin', 'teacher']), listAuditLogs);

module.exports = router;
