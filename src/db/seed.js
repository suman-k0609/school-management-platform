/**
 * Synthetic Seed Data for School Management Platform
 * Populates Users, Classes, Teacher Assignments, Student Enrollments, and Attendance.
 */
const { Pool } = require('pg');
const config = require('../config/env');
const logger = require('../config/logger');

const SEED_DATA = {
  users: [
    // Administrators
    {
      id: 'usr-admin-1',
      name: 'Principal Margaret Hamilton',
      email: 'principal@school.edu',
      role: 'admin',
    },
    // Teachers
    {
      id: 'usr-teacher-1',
      name: 'Prof. Alan Turing',
      email: 'turing@school.edu',
      role: 'teacher',
    },
    {
      id: 'usr-teacher-2',
      name: 'Prof. Ada Lovelace',
      email: 'lovelace@school.edu',
      role: 'teacher',
    },
    {
      id: 'usr-teacher-3',
      name: 'Prof. Grace Hopper',
      email: 'hopper@school.edu',
      role: 'teacher',
    },
    // Students
    {
      id: 'usr-student-1',
      name: 'Alice Smith',
      email: 'alice.smith@student.school.edu',
      role: 'student',
    },
    {
      id: 'usr-student-2',
      name: 'Bob Jones',
      email: 'bob.jones@student.school.edu',
      role: 'student',
    },
    {
      id: 'usr-student-3',
      name: 'Charlie Brown',
      email: 'charlie.brown@student.school.edu',
      role: 'student',
    },
    {
      id: 'usr-student-4',
      name: 'Diana Prince',
      email: 'diana.prince@student.school.edu',
      role: 'student',
    },
    {
      id: 'usr-student-5',
      name: 'Evan Wright',
      email: 'evan.wright@student.school.edu',
      role: 'student',
    },
  ],

  classes: [
    {
      id: 'cls-math-101',
      name: 'Grade 10 Mathematics',
      code: 'MATH101',
      room: 'Room 101',
      academic_year: '2026-2027',
    },
    {
      id: 'cls-sci-201',
      name: 'Grade 10 Physical Science',
      code: 'SCI201',
      room: 'Physics Lab 2',
      academic_year: '2026-2027',
    },
  ],

  // Mapping: Which teacher teaches which class
  classTeachers: [
    { class_id: 'cls-math-101', teacher_id: 'usr-teacher-1' }, // Prof. Turing teaches Math
    { class_id: 'cls-sci-201', teacher_id: 'usr-teacher-2' }, // Prof. Lovelace teaches Science
    // Notice: usr-teacher-3 (Prof. Grace Hopper) is NOT assigned to cls-math-101
  ],

  // Enrollment: Which student belongs to which class
  classStudents: [
    // Students enrolled in cls-math-101
    { class_id: 'cls-math-101', student_id: 'usr-student-1' },
    { class_id: 'cls-math-101', student_id: 'usr-student-2' },
    { class_id: 'cls-math-101', student_id: 'usr-student-4' },
    { class_id: 'cls-math-101', student_id: 'usr-student-5' },

    // Students enrolled in cls-sci-201
    { class_id: 'cls-sci-201', student_id: 'usr-student-1' },
    { class_id: 'cls-sci-201', student_id: 'usr-student-3' }, // Charlie is enrolled in Science only
  ],

  // Pre-seeded Attendance Record
  initialAttendance: [
    {
      id: 'att-seed-001',
      class_id: 'cls-math-101',
      student_id: 'usr-student-1',
      recorded_by: 'usr-teacher-1',
      date: '2026-11-10',
      session: 'morning',
      status: 'present',
      notes: 'On time and engaged',
    },
    {
      id: 'att-seed-002',
      class_id: 'cls-math-101',
      student_id: 'usr-student-2',
      recorded_by: 'usr-teacher-1',
      date: '2026-11-10',
      session: 'morning',
      status: 'present',
      notes: 'Participated in discussion',
    },
  ],
};

async function seedDatabase(customPool) {
  const pool =
    customPool ||
    new Pool(
      config.database.connectionString
        ? { connectionString: config.database.connectionString }
        : config.database
    );

  const client = await pool.connect();
  try {
    logger.info('Starting database seeding...');
    await client.query('BEGIN');

    // 1. Seed Users
    for (const u of SEED_DATA.users) {
      await client.query(
        `INSERT INTO users (id, name, email, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role`,
        [u.id, u.name, u.email, u.role]
      );
    }

    // 2. Seed Classes
    for (const c of SEED_DATA.classes) {
      await client.query(
        `INSERT INTO classes (id, name, code, room, academic_year)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, room = EXCLUDED.room`,
        [c.id, c.name, c.code, c.room, c.academic_year]
      );
    }

    // 3. Seed Class Teachers
    for (const ct of SEED_DATA.classTeachers) {
      await client.query(
        `INSERT INTO class_teachers (class_id, teacher_id)
         VALUES ($1, $2)
         ON CONFLICT (class_id, teacher_id) DO NOTHING`,
        [ct.class_id, ct.teacher_id]
      );
    }

    // 4. Seed Class Students
    for (const cs of SEED_DATA.classStudents) {
      await client.query(
        `INSERT INTO class_students (class_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT (class_id, student_id) DO NOTHING`,
        [cs.class_id, cs.student_id]
      );
    }

    // 5. Seed Initial Attendance
    for (const att of SEED_DATA.initialAttendance) {
      await client.query(
        `INSERT INTO attendance (id, class_id, student_id, recorded_by, date, session, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (class_id, student_id, date, session) DO NOTHING`,
        [
          att.id,
          att.class_id,
          att.student_id,
          att.recorded_by,
          att.date,
          att.session,
          att.status,
          att.notes,
        ]
      );
    }

    // Initial Audit Log Entry
    await client.query(
      `INSERT INTO audit_logs (id, action, user_id, user_role, resource_type, resource_id, status, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        'audit-seed-001',
        'SYSTEM_SEED',
        'usr-admin-1',
        'admin',
        'database',
        'seed_data',
        'SUCCESS',
        JSON.stringify({
          seededAt: new Date().toISOString(),
          classesCount: SEED_DATA.classes.length,
        }),
      ]
    );

    await client.query('COMMIT');
    logger.info('Database seeded successfully with synthetic classes, students, and attendance.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Database seeding failed', err);
    throw err;
  } finally {
    client.release();
    if (!customPool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = {
  SEED_DATA,
  seedDatabase,
};
