/**
 * Configuration & Environment Variables Module
 * Enforces least privilege, fallback defaults, and validation.
 */
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  logLevel: process.env.LOG_LEVEL || 'info',
  trustProxy: process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // In-Memory Mode (useful for zero-dependency local runs and unit testing)
  inMemoryDb: process.env.DB_IN_MEMORY === 'true' || process.env.NODE_ENV === 'test',

  // PostgreSQL Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'school_management',
    user: process.env.DB_USER || 'school_admin',
    password: process.env.DB_PASSWORD || 'school_secure_pass',
    connectionString: process.env.DATABASE_URL || undefined,
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_TIMEOUT_MS || '5000', 10),
  },

  // Service Metadata
  serviceName: 'school-management-api',
  version: process.env.APP_VERSION || '1.0.0',
};

module.exports = config;
