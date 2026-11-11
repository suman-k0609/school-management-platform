/**
 * Class Routes
 */
const express = require('express');
const {
  listClasses,
  getClassById,
  getClassStudents,
  getClassAttendance,
} = require('../controllers/classController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Public/authenticated class inspection endpoints
router.get('/', listClasses);
router.get('/:id', getClassById);
router.get('/:id/students', getClassStudents);
router.get('/:id/attendance', getClassAttendance);

module.exports = router;
