/**
 * Application Entrypoint
 * Bootstraps database, runs migrations and synthetic seed if needed,
 * and handles graceful process termination.
 */
const http = require('http');
const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const { isInMemory, close: closeDb } = require('./db');
const { runMigrations } = require('./db/migrations');
const { seedDatabase } = require('./db/seed');

let server = null;

async function bootstrap() {
  logger.info('Initializing School Management Platform API...', {
    env: config.env,
    version: config.version,
    port: config.port,
    mode: isInMemory() ? 'in-memory' : 'postgresql',
  });

  // If running against real PostgreSQL, ensure schema and seed data exist
  if (!isInMemory()) {
    try {
      logger.info('Connecting to PostgreSQL database and verifying schema...');
      await runMigrations();
      await seedDatabase();
      logger.info('Database migrations and seed data initialized successfully.');
    } catch (err) {
      logger.warn(
        'PostgreSQL initialization deferred or failed (will run in degraded mode / wait for DB ready):',
        {
          error: err.message,
        }
      );
    }
  } else {
    logger.info('Running in in-memory mode with synthetic seed data ready.');
  }

  // Create HTTP server
  server = http.createServer(app);

  server.listen(config.port, () => {
    logger.info(`Server successfully listening on port ${config.port}`, {
      url: `http://localhost:${config.port}`,
      health: `http://localhost:${config.port}/health`,
      readiness: `http://localhost:${config.port}/ready`,
      metrics: `http://localhost:${config.port}/metrics`,
    });
  });

  // Handle termination signals for zero-downtime rolling deploys and clean shutdowns
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    if (server) {
      server.close(() => {
        logger.info('HTTP server closed. No longer accepting new connections.');
      });
    }

    try {
      await closeDb();
      logger.info('Graceful shutdown completed successfully. Exiting process.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during graceful shutdown', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  bootstrap().catch((err) => {
    logger.error('Failed to start application server', err);
    process.exit(1);
  });
}

module.exports = {
  bootstrap,
};
