/**
 * Attendance Routes
 */
const express = require('express');
const { recordAttendance } = require('../controllers/attendanceController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateAttendancePayload } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

// POST /api/v1/attendance
// Enforce role restrictions on write endpoints: only teachers or admins
router.post('/', requireRole(['teacher', 'admin']), validateAttendancePayload, recordAttendance);

module.exports = router;
