/**
 * Class Service Module
 * Handles class listings, enrolled students retrieval, and membership checks.
 */
const { getPool, isInMemory, memoryStore } = require('../db');

class ClassService {
  /**
   * List all classes
   */
  async listClasses() {
    if (isInMemory()) {
      const classes = [];
      for (const c of memoryStore.classes.values()) {
        // Find assigned teachers
        const assignedTeachers = [];
        for (const ct of memoryStore.classTeachers) {
          const [classId, teacherId] = ct.split(':');
          if (classId === c.id) {
            const teacher = memoryStore.users.get(teacherId);
            if (teacher) {
              assignedTeachers.push({ id: teacher.id, name: teacher.name, email: teacher.email });
            }
          }
        }

        // Count enrolled students
        let studentCount = 0;
        for (const cs of memoryStore.classStudents) {
          const [classId] = cs.split(':');
          if (classId === c.id) studentCount++;
        }

        classes.push({
          ...c,
          assignedTeachers,
          enrolledStudentsCount: studentCount,
        });
      }
      return classes;
    }

    const pool = getPool();
    const query = `
      SELECT 
        c.id, 
        c.name, 
        c.code, 
        c.room, 
        c.academic_year, 
        c.created_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email)
          ) FILTER (WHERE u.id IS NOT NULL), '[]'
        ) as "assignedTeachers",
        COUNT(DISTINCT cs.student_id)::int as "enrolledStudentsCount"
      FROM classes c
      LEFT JOIN class_teachers ct ON c.id = ct.class_id
      LEFT JOIN users u ON ct.teacher_id = u.id
      LEFT JOIN class_students cs ON c.id = cs.class_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get single class by ID
   */
  async getClassById(classId) {
    if (isInMemory()) {
      const c = memoryStore.classes.get(classId);
      if (!c) return null;

      const assignedTeachers = [];
      for (const ct of memoryStore.classTeachers) {
        const [clsId, teacherId] = ct.split(':');
        if (clsId === classId) {
          const teacher = memoryStore.users.get(teacherId);
          if (teacher) {
            assignedTeachers.push({ id: teacher.id, name: teacher.name, email: teacher.email });
          }
        }
      }

      return {
        ...c,
        assignedTeachers,
      };
    }

    const pool = getPool();
    const query = `
      SELECT 
        c.id, 
        c.name, 
        c.code, 
        c.room, 
        c.academic_year, 
        c.created_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email)
          ) FILTER (WHERE u.id IS NOT NULL), '[]'
        ) as "assignedTeachers"
      FROM classes c
      LEFT JOIN class_teachers ct ON c.id = ct.class_id
      LEFT JOIN users u ON ct.teacher_id = u.id
      WHERE c.id = $1
      GROUP BY c.id
    `;
    const result = await pool.query(query, [classId]);
    return result.rows[0] || null;
  }

  /**
   * Get enrolled students for a given class
   */
  async getClassStudents(classId) {
    // First verify class exists
    const classRecord = await this.getClassById(classId);
    if (!classRecord) {
      const err = new Error(`Class with ID '${classId}' not found`);
      err.statusCode = 404;
      err.code = 'CLASS_NOT_FOUND';
      throw err;
    }

    if (isInMemory()) {
      const students = [];
      for (const cs of memoryStore.classStudents) {
        const [clsId, studentId] = cs.split(':');
        if (clsId === classId) {
          const student = memoryStore.users.get(studentId);
          if (student) {
            students.push({
              id: student.id,
              name: student.name,
              email: student.email,
              role: student.role,
            });
          }
        }
      }
      return students;
    }

    const pool = getPool();
    const query = `
      SELECT u.id, u.name, u.email, u.role, cs.enrolled_at
      FROM class_students cs
      INNER JOIN users u ON cs.student_id = u.id
      WHERE cs.class_id = $1
      ORDER BY u.name ASC
    `;
    const result = await pool.query(query, [classId]);
    return result.rows;
  }

  /**
   * Check if teacher is assigned to class
   */
  async isTeacherAssigned(classId, teacherId) {
    if (isInMemory()) {
      return memoryStore.classTeachers.has(`${classId}:${teacherId}`);
    }

    const pool = getPool();
    const result = await pool.query(
      'SELECT 1 FROM class_teachers WHERE class_id = $1 AND teacher_id = $2',
      [classId, teacherId]
    );
    return result.rowCount > 0;
  }

  /**
   * Check if student is enrolled in class
   */
  async isStudentEnrolled(classId, studentId) {
    if (isInMemory()) {
      return memoryStore.classStudents.has(`${classId}:${studentId}`);
    }

    const pool = getPool();
    const result = await pool.query(
      'SELECT 1 FROM class_students WHERE class_id = $1 AND student_id = $2',
      [classId, studentId]
    );
    return result.rowCount > 0;
  }
}

module.exports = new ClassService();
