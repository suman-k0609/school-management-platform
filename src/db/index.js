/**
 * Database Interface Module
 * Supports PostgreSQL connection pooling with health check and graceful shutdown.
 * Also includes an in-memory repository store fallback for zero-dependency test execution.
 */
const { Pool } = require('pg');
const config = require('../config/env');
const logger = require('../config/logger');
const { SEED_DATA } = require('./seed');

let pool = null;
let isInMemory = config.inMemoryDb;

// In-Memory storage objects when running in-memory
const memoryStore = {
  users: new Map(),
  classes: new Map(),
  classTeachers: new Set(), // strings like "cls-math-101:usr-teacher-1"
  classStudents: new Set(), // strings like "cls-math-101:usr-student-1"
  attendance: new Map(),
  auditLogs: [],
};

function seedInMemoryStore() {
  memoryStore.users.clear();
  memoryStore.classes.clear();
  memoryStore.classTeachers.clear();
  memoryStore.classStudents.clear();
  memoryStore.attendance.clear();
  memoryStore.auditLogs = [];

  for (const u of SEED_DATA.users) {
    memoryStore.users.set(u.id, { ...u, created_at: new Date() });
  }

  for (const c of SEED_DATA.classes) {
    memoryStore.classes.set(c.id, { ...c, created_at: new Date() });
  }

  for (const ct of SEED_DATA.classTeachers) {
    memoryStore.classTeachers.add(`${ct.class_id}:${ct.teacher_id}`);
  }

  for (const cs of SEED_DATA.classStudents) {
    memoryStore.classStudents.add(`${cs.class_id}:${cs.student_id}`);
  }

  for (const a of SEED_DATA.initialAttendance) {
    memoryStore.attendance.set(a.id, { ...a, created_at: new Date() });
  }

  memoryStore.auditLogs.push({
    id: 'audit-seed-001',
    action: 'SYSTEM_SEED',
    user_id: 'usr-admin-1',
    user_role: 'admin',
    resource_type: 'database',
    resource_id: 'seed_data',
    status: 'SUCCESS',
    details: { memorySeeded: true },
    created_at: new Date(),
  });
}

function getPool() {
  if (isInMemory) return null;

  if (!pool) {
    const poolConfig = config.database.connectionString
      ? { connectionString: config.database.connectionString }
      : config.database;

    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client pool', err);
    });
  }
  return pool;
}

async function query(text, params) {
  if (isInMemory) {
    throw new Error('Direct SQL query not supported in pure memory mode; use repositories.');
  }
  const currentPool = getPool();
  const start = Date.now();
  const res = await currentPool.query(text, params);
  const duration = Date.now() - start;
  logger.debug('Executed DB query', { text, duration, rows: res.rowCount });
  return res;
}

async function isHealthy() {
  if (isInMemory) {
    return { healthy: true, mode: 'in-memory', activeConnections: 1 };
  }
  try {
    const currentPool = getPool();
    const result = await currentPool.query('SELECT 1 as ping');
    return {
      healthy: result.rows[0].ping === 1,
      mode: 'postgresql',
      totalCount: currentPool.totalCount,
      idleCount: currentPool.idleCount,
      waitingCount: currentPool.waitingCount,
    };
  } catch (err) {
    logger.error('Database health check failed', err);
    return {
      healthy: false,
      mode: 'postgresql',
      error: err.message,
    };
  }
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}

function setInMemoryMode(enabled) {
  isInMemory = enabled;
  if (enabled) {
    seedInMemoryStore();
  }
}

// Initialize memory store if in memory mode by default
if (isInMemory) {
  seedInMemoryStore();
}

module.exports = {
  getPool,
  query,
  isHealthy,
  close,
  setInMemoryMode,
  isInMemory: () => isInMemory,
  memoryStore,
  seedInMemoryStore,
};
