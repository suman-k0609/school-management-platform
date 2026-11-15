/**
 * Class API Integration Tests
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/app');
const { setInMemoryMode } = require('../../src/db');

describe('Classes API Endpoints', () => {
  before(() => {
    setInMemoryMode(true);
  });

  it('GET /api/v1/classes should return all synthetic classes with assigned teachers and enrollment counts', async () => {
    const res = await request(app).get('/api/v1/classes');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.count >= 2);

    const mathClass = res.body.data.find((c) => c.id === 'cls-math-101');
    assert.ok(mathClass, 'Math class should be present in synthetic seed data');
    assert.equal(mathClass.code, 'MATH101');
    assert.ok(mathClass.assignedTeachers.length > 0);
    assert.ok(mathClass.enrolledStudentsCount > 0);
  });

  it('GET /api/v1/classes/:id should return single class details', async () => {
    const res = await request(app).get('/api/v1/classes/cls-math-101');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, 'cls-math-101');
    assert.equal(res.body.data.name, 'Grade 10 Mathematics');
  });

  it('GET /api/v1/classes/:id with non-existent ID should return 404', async () => {
    const res = await request(app).get('/api/v1/classes/non-existent-class-id');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CLASS_NOT_FOUND');
  });

  it('GET /api/v1/classes/:id/students should return list of enrolled students', async () => {
    const res = await request(app).get('/api/v1/classes/cls-math-101/students');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.count >= 3);

    const alice = res.body.data.find((s) => s.id === 'usr-student-1');
    assert.ok(alice, 'Alice Smith should be enrolled in cls-math-101');
  });

  it('GET /api/v1/classes/:id/students with invalid class ID should return 404', async () => {
    const res = await request(app).get('/api/v1/classes/invalid-class/students');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CLASS_NOT_FOUND');
  });
});

