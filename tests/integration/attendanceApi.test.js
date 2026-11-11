/**
 * Attendance API Integration Tests
 * Specifically exercises and validates Acceptance Test #1:
 * "A non-teacher or unassigned teacher must not write attendance for a class."
 * And validates membership and duplicate attendance prevention rules.
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/app');
const { setInMemoryMode, seedInMemoryStore } = require('../../src/db');

describe('Attendance API Acceptance Tests & Business Logic', () => {
  beforeEach(() => {
    // Reset seed state before each test to ensure determinism
    setInMemoryMode(true);
    seedInMemoryStore();
  });

  describe('Acceptance Test 1: Role & Assignment Authorization', () => {
    it('RULE 1A: Non-teacher role (Student) must NOT write attendance for a class -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('x-user-id', 'usr-student-1') // Role: student
        .send({
          classId: 'cls-math-101',
          studentId: 'usr-student-2',
          date: '2026-11-12',
          session: 'morning',
          status: 'present',
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'FORBIDDEN_ROLE');
      assert.match(res.body.error.message, /not authorized/i);
    });

    it('RULE 1B: Unauthenticated user without credentials must NOT write attendance -> 401 Unauthorized', async () => {
      const res = await request(app).post('/api/v1/attendance').send({
        classId: 'cls-math-101',
        studentId: 'usr-student-2',
        date: '2026-11-12',
        session: 'morning',
        status: 'present',
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'UNAUTHENTICATED');
    });

    it('RULE 1C: UNASSIGNED teacher must NOT write attendance for a class -> 403 Forbidden', async () => {
      // usr-teacher-3 (Grace Hopper) is NOT assigned to teach cls-math-101
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('x-user-id', 'usr-teacher-3') // Role: teacher, but unassigned to Math 101
        .send({
          classId: 'cls-math-101',
          studentId: 'usr-student-1',
          date: '2026-11-12',
          session: 'morning',
          status: 'present',
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'UNASSIGNED_TEACHER');
      assert.match(res.body.error.message, /not assigned to class/i);
    });
  });

  describe('Acceptance Test 2: Student Membership Validation', () => {
    it('RULE 2: Attempting to record attendance for a student NOT enrolled in the class must return 422 Unprocessable Entity', async () => {
      // usr-student-3 (Charlie Brown) is enrolled ONLY in Science (cls-sci-201), NOT Math (cls-math-101)
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('x-user-id', 'usr-teacher-1') // Prof. Turing is assigned to cls-math-101
        .send({
          classId: 'cls-math-101',
          studentId: 'usr-student-3', // NOT enrolled in cls-math-101!
          date: '2026-11-12',
          session: 'morning',
          status: 'present',
        });

      assert.equal(res.status, 422);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'STUDENT_NOT_ENROLLED');
      assert.match(res.body.error.message, /not enrolled in class/i);
    });
  });

  describe('Acceptance Test 3: Authorized Recording & Duplicate Prevention', () => {
    it('RULE 3A: Authorized assigned teacher recording attendance for enrolled student must succeed -> 201 Created', async () => {
      // usr-teacher-1 teaches cls-math-101, usr-student-1 is enrolled
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('x-user-id', 'usr-teacher-1')
        .send({
          classId: 'cls-math-101',
          studentId: 'usr-student-1',
          date: '2026-11-12',
          session: 'afternoon',
          status: 'present',
          notes: 'Great participation in algebra exercises',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.class_id, 'cls-math-101');
      assert.equal(res.body.data.student_id, 'usr-student-1');
      assert.equal(res.body.data.recorded_by, 'usr-teacher-1');
      assert.equal(res.body.data.status, 'present');
      assert.equal(res.body.data.session, 'afternoon');
    });

    it('RULE 3B: Duplicate attendance for same class, student, date, and session must be PREVENTED -> 409 Conflict', async () => {
      // First submission
      const firstRes = await request(app)
        .post('/api/v1/attendance')
        .set('x-user-id', 'usr-teacher-1')
        .send({
          classId: 'cls-math-101',
          studentId: 'usr-student-2',
          date: '2026-11-15',
          session: 'morning',
          status: 'present',
        });
      assert.equal(firstRes.status, 201);

      // Duplicate submission attempt
      const dupRes = await request(app)
        .post('/api/v1/attendance')
        .set('x-user-id', 'usr-teacher-1')
        .send({
          classId: 'cls-math-101',
          studentId: 'usr-student-2',
          date: '2026-11-15',
          session: 'morning',
          status: 'late', // even with changed status, duplicate entry is rejected!
        });

      assert.equal(dupRes.status, 409);
      assert.equal(dupRes.body.success, false);
      assert.equal(dupRes.body.error.code, 'DUPLICATE_ATTENDANCE');
      assert.match(dupRes.body.error.message, /already been recorded/i);
    });
  });

  describe('Acceptance Test 4: Audit Trail Verification', () => {
    it('RULE 4: System must capture audit log for write actions and security violations', async () => {
      // Trigger a forbidden action
      await request(app)
        .post('/api/v1/attendance')
        .set('x-user-id', 'usr-teacher-3') // unassigned
        .send({
          classId: 'cls-math-101',
          studentId: 'usr-student-1',
          date: '2026-11-12',
          session: 'morning',
          status: 'present',
        });

      // Query audit logs as admin
      const auditRes = await request(app).get('/api/v1/audit-logs').set('x-user-id', 'usr-admin-1');

      assert.equal(auditRes.status, 200);
      assert.equal(auditRes.body.success, true);
      assert.ok(Array.isArray(auditRes.body.data));

      const forbiddenEvent = auditRes.body.data.find(
        (e) => e.action === 'RECORD_ATTENDANCE_ATTEMPT' && e.status === 'FORBIDDEN'
      );
      assert.ok(forbiddenEvent, 'Forbidden attendance attempt must be logged in audit trail');
    });
  });
});
