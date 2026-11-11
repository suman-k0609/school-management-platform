/**
 * Request Validation Middleware
 */

function validateAttendancePayload(req, res, next) {
  const { classId, studentId, date, session, status } = req.body || {};
  const errors = [];

  if (!classId || typeof classId !== 'string' || !classId.trim()) {
    errors.push({ field: 'classId', message: 'Field "classId" is required and must be a string' });
  }

  if (!studentId || typeof studentId !== 'string' || !studentId.trim()) {
    errors.push({
      field: 'studentId',
      message: 'Field "studentId" is required and must be a string',
    });
  }

  if (!date || isNaN(Date.parse(date))) {
    errors.push({
      field: 'date',
      message: 'Field "date" is required and must be a valid ISO date string (YYYY-MM-DD)',
    });
  }

  if (!session || typeof session !== 'string' || !session.trim()) {
    errors.push({
      field: 'session',
      message: 'Field "session" is required (e.g. "morning", "afternoon", "period-1")',
    });
  }

  const validStatuses = ['present', 'absent', 'late', 'excused'];
  if (!status || !validStatuses.includes(status.toLowerCase().trim())) {
    errors.push({
      field: 'status',
      message: `Field "status" is required and must be one of: ${validStatuses.join(', ')}`,
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request body failed validation',
        details: errors,
      },
      requestId: req.id,
    });
  }

  next();
}

module.exports = {
  validateAttendancePayload,
};
