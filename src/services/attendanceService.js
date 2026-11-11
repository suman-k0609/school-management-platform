/**
 * Attendance Service Module
 * Implements the core domain business logic and acceptance criteria:
 * 1. Role validation (teacher / admin)
 * 2. Teacher-to-class assignment validation (unassigned teachers blocked)
 * 3. Student class membership validation (non-enrolled students blocked)
 * 4. Duplicate attendance prevention for (class, student, date, session)
 * 5. Audit trail generation for all write operations
 */
const { getPool, isInMemory, memoryStore } = require('../db');
const classService = require('./classService');
const auditService = require('./auditService');
const logger = require('../config/logger');

const VALID_STATUSES = ['present', 'absent', 'late', 'excused'];

class AttendanceService {
  /**
   * Record attendance for an assigned student in a class
   */
  async recordAttendance({
    user,
    classId,
    studentId,
    date,
    session,
    status,
    notes = '',
    ipAddress = null,
  }) {
    // 1. Role Check: Only teachers (or admins) are authorized
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      await auditService.logEvent({
        action: 'RECORD_ATTENDANCE_ATTEMPT',
        userId: user ? user.id : 'anonymous',
        userRole: user ? user.role : 'none',
        resourceType: 'attendance',
        resourceId: classId,
        status: 'FORBIDDEN',
        ipAddress,
        details: { reason: 'Unauthorized role', requiredRole: 'teacher' },
      });

      const err = new Error('Access denied: Only authorized teachers can record attendance');
      err.statusCode = 403;
      err.code = 'FORBIDDEN_ROLE';
      throw err;
    }

    // 2. Validate Class existence
    const classRecord = await classService.getClassById(classId);
    if (!classRecord) {
      await auditService.logEvent({
        action: 'RECORD_ATTENDANCE_ATTEMPT',
        userId: user.id,
        userRole: user.role,
        resourceType: 'class',
        resourceId: classId,
        status: 'FAILED',
        ipAddress,
        details: { reason: 'Class not found' },
      });

      const err = new Error(`Class with ID '${classId}' not found`);
      err.statusCode = 404;
      err.code = 'CLASS_NOT_FOUND';
      throw err;
    }

    // 3. Acceptance Rule 1: A non-teacher or UNASSIGNED teacher must not write attendance for a class
    if (user.role === 'teacher') {
      const isAssigned = await classService.isTeacherAssigned(classId, user.id);
      if (!isAssigned) {
        await auditService.logEvent({
          action: 'RECORD_ATTENDANCE_ATTEMPT',
          userId: user.id,
          userRole: user.role,
          resourceType: 'attendance',
          resourceId: classId,
          status: 'FORBIDDEN',
          ipAddress,
          details: {
            reason: 'Teacher not assigned to this class',
            classId,
            teacherId: user.id,
          },
        });

        const err = new Error(`Teacher '${user.id}' is not assigned to class '${classId}'`);
        err.statusCode = 403;
        err.code = 'UNASSIGNED_TEACHER';
        throw err;
      }
    }

    // 4. Validate Student/Class membership
    const isEnrolled = await classService.isStudentEnrolled(classId, studentId);
    if (!isEnrolled) {
      await auditService.logEvent({
        action: 'RECORD_ATTENDANCE_ATTEMPT',
        userId: user.id,
        userRole: user.role,
        resourceType: 'attendance',
        resourceId: classId,
        status: 'FAILED',
        ipAddress,
        details: {
          reason: 'Student is not enrolled in class',
          classId,
          studentId,
        },
      });

      const err = new Error(`Student '${studentId}' is not enrolled in class '${classId}'`);
      err.statusCode = 422;
      err.code = 'STUDENT_NOT_ENROLLED';
      throw err;
    }

    // 5. Validate status value
    const normalizedStatus = (status || '').toLowerCase().trim();
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      const err = new Error(
        `Invalid attendance status '${status}'. Must be one of: ${VALID_STATUSES.join(', ')}`
      );
      err.statusCode = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    // 6. Validate duplicate attendance prevention for same date/session
    const formattedDate = new Date(date).toISOString().split('T')[0];
    const normalizedSession = (session || '').toLowerCase().trim();

    const existing = await this.getExistingAttendance(
      classId,
      studentId,
      formattedDate,
      normalizedSession
    );
    if (existing) {
      await auditService.logEvent({
        action: 'RECORD_ATTENDANCE_ATTEMPT',
        userId: user.id,
        userRole: user.role,
        resourceType: 'attendance',
        resourceId: existing.id,
        status: 'FAILED',
        ipAddress,
        details: {
          reason: 'Duplicate attendance entry detected',
          classId,
          studentId,
          date: formattedDate,
          session: normalizedSession,
        },
      });

      const err = new Error(
        `Duplicate attendance entry: Attendance for student '${studentId}' in class '${classId}' on ${formattedDate} (${normalizedSession}) has already been recorded`
      );
      err.statusCode = 409;
      err.code = 'DUPLICATE_ATTENDANCE';
      throw err;
    }

    // 7. Insert attendance record
    const attendanceId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const newRecord = {
      id: attendanceId,
      class_id: classId,
      student_id: studentId,
      recorded_by: user.id,
      date: formattedDate,
      session: normalizedSession,
      status: normalizedStatus,
      notes: notes || null,
      created_at: now,
      updated_at: now,
    };

    if (isInMemory()) {
      memoryStore.attendance.set(attendanceId, newRecord);
    } else {
      const pool = getPool();
      await pool.query(
        `INSERT INTO attendance (id, class_id, student_id, recorded_by, date, session, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          newRecord.id,
          newRecord.class_id,
          newRecord.student_id,
          newRecord.recorded_by,
          newRecord.date,
          newRecord.session,
          newRecord.status,
          newRecord.notes,
          newRecord.created_at,
          newRecord.updated_at,
        ]
      );
    }

    // 8. Record audit log for successful write
    await auditService.logEvent({
      action: 'RECORD_ATTENDANCE',
      userId: user.id,
      userRole: user.role,
      resourceType: 'attendance',
      resourceId: attendanceId,
      status: 'SUCCESS',
      ipAddress,
      details: {
        classId,
        studentId,
        date: formattedDate,
        session: normalizedSession,
        status: normalizedStatus,
      },
    });

    logger.info('Attendance recorded successfully', {
      attendanceId,
      classId,
      studentId,
      recordedBy: user.id,
      status: normalizedStatus,
    });

    return newRecord;
  }

  /**
   * Check for existing attendance record
   */
  async getExistingAttendance(classId, studentId, date, session) {
    if (isInMemory()) {
      for (const record of memoryStore.attendance.values()) {
        const recordDate =
          typeof record.date === 'string'
            ? record.date
            : new Date(record.date).toISOString().split('T')[0];

        if (
          record.class_id === classId &&
          record.student_id === studentId &&
          recordDate === date &&
          record.session.toLowerCase() === session.toLowerCase()
        ) {
          return record;
        }
      }
      return null;
    }

    const pool = getPool();
    const query = `
      SELECT id, class_id, student_id, recorded_by, date::text as date, session, status, notes, created_at
      FROM attendance
      WHERE class_id = $1 AND student_id = $2 AND date = $3 AND session = $4
    `;
    const result = await pool.query(query, [classId, studentId, date, session]);
    return result.rows[0] || null;
  }

  /**
   * List attendance records for a class with optional filters
   */
  async getAttendanceByClass(classId, { date = null, session = null, studentId = null } = {}) {
    // Verify class exists
    const classRecord = await classService.getClassById(classId);
    if (!classRecord) {
      const err = new Error(`Class with ID '${classId}' not found`);
      err.statusCode = 404;
      err.code = 'CLASS_NOT_FOUND';
      throw err;
    }

    if (isInMemory()) {
      const results = [];
      for (const record of memoryStore.attendance.values()) {
        if (record.class_id !== classId) continue;

        const recordDate =
          typeof record.date === 'string'
            ? record.date
            : new Date(record.date).toISOString().split('T')[0];

        if (date && recordDate !== date) continue;
        if (session && record.session.toLowerCase() !== session.toLowerCase()) continue;
        if (studentId && record.student_id !== studentId) continue;

        const student = memoryStore.users.get(record.student_id);
        const teacher = memoryStore.users.get(record.recorded_by);

        results.push({
          ...record,
          studentName: student ? student.name : 'Unknown',
          recordedByName: teacher ? teacher.name : 'Unknown',
        });
      }
      return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const pool = getPool();
    const conditions = ['a.class_id = $1'];
    const params = [classId];
    let paramIndex = 2;

    if (date) {
      conditions.push(`a.date = $${paramIndex++}`);
      params.push(date);
    }
    if (session) {
      conditions.push(`LOWER(a.session) = LOWER($${paramIndex++})`);
      params.push(session);
    }
    if (studentId) {
      conditions.push(`a.student_id = $${paramIndex++}`);
      params.push(studentId);
    }

    const query = `
      SELECT 
        a.id, 
        a.class_id, 
        a.student_id, 
        u_student.name as "studentName",
        a.recorded_by, 
        u_teacher.name as "recordedByName",
        a.date::text as date, 
        a.session, 
        a.status, 
        a.notes, 
        a.created_at
      FROM attendance a
      INNER JOIN users u_student ON a.student_id = u_student.id
      INNER JOIN users u_teacher ON a.recorded_by = u_teacher.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.date DESC, a.created_at DESC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = new AttendanceService();
