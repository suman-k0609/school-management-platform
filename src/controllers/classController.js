/**
 * Class Controller
 */
const classService = require('../services/classService');
const attendanceService = require('../services/attendanceService');

async function listClasses(req, res, next) {
  try {
    const classes = await classService.listClasses();
    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes,
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
}

async function getClassById(req, res, next) {
  try {
    const classRecord = await classService.getClassById(req.params.id);
    if (!classRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CLASS_NOT_FOUND',
          message: `Class with ID '${req.params.id}' was not found`,
        },
        requestId: req.id,
      });
    }

    res.status(200).json({
      success: true,
      data: classRecord,
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
}

async function getClassStudents(req, res, next) {
  try {
    const students = await classService.getClassStudents(req.params.id);
    res.status(200).json({
      success: true,
      classId: req.params.id,
      count: students.length,
      data: students,
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
}

async function getClassAttendance(req, res, next) {
  try {
    const { date, session, studentId } = req.query;
    const records = await attendanceService.getAttendanceByClass(req.params.id, {
      date,
      session,
      studentId,
    });

    res.status(200).json({
      success: true,
      classId: req.params.id,
      count: records.length,
      data: records,
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listClasses,
  getClassById,
  getClassStudents,
  getClassAttendance,
};
