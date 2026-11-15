/**
 * Health & Observability Endpoints Integration Tests
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/app');
const { setInMemoryMode } = require('../../src/db');

describe('Health and Observability Endpoints', () => {
  before(() => {
    // Ensure in-memory database mode for isolated integration test execution
    setInMemoryMode(true);
  });

  after(() => {
    // cleanup
  });

  it('GET /health should return 200 and status UP with version metadata', async () => {
    const res = await request(app).get('/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'UP');
    assert.equal(typeof res.body.uptimeSeconds, 'number');
    assert.equal(res.body.service, 'school-management-api');
    assert.ok(res.body.timestamp);
    assert.ok(res.headers['x-request-id']);
  });

  it('GET /ready should return 200 and status READY when database is healthy', async () => {
    const res = await request(app).get('/ready');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'READY');
    assert.equal(res.body.database.healthy, true);
    assert.ok(res.body.timestamp);
  });

  it('GET /metrics should return operational metrics with memory and request telemetry', async () => {
    const res = await request(app).get('/metrics');

    assert.equal(res.status, 200);
    assert.equal(typeof res.body.totalRequests, 'number');
    assert.ok(res.body.memoryUsage);
    assert.ok(res.body.uptimeSeconds >= 0);
  });
});

