/**
 * Attendance Controller
 */
const attendanceService = require('../services/attendanceService');

async function recordAttendance(req, res, next) {
  try {
    const { classId, studentId, date, session, status, notes } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress;

    const record = await attendanceService.recordAttendance({
      user: req.user,
      classId,
      studentId,
      date,
      session,
      status,
      notes,
      ipAddress: clientIp,
    });

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: record,
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recordAttendance,
};
