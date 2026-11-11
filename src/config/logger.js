/**
 * Structured Logger Module
 * Outputs JSON format logs in production/test for machine ingestion,
 * and human-friendly structured output in development.
 */
const config = require('./env');

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevelPriority = LOG_LEVELS[config.logLevel] ?? LOG_LEVELS.info;

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    service: config.serviceName,
    version: config.version,
    level: level.toUpperCase(),
    message,
    ...meta,
  };

  if (meta instanceof Error) {
    logEntry.error = {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    };
  }

  return JSON.stringify(logEntry);
}

const logger = {
  debug(message, meta) {
    if (currentLevelPriority <= LOG_LEVELS.debug) {
      console.debug(formatLog('debug', message, meta));
    }
  },
  info(message, meta) {
    if (currentLevelPriority <= LOG_LEVELS.info) {
      console.info(formatLog('info', message, meta));
    }
  },
  warn(message, meta) {
    if (currentLevelPriority <= LOG_LEVELS.warn) {
      console.warn(formatLog('warn', message, meta));
    }
  },
  error(message, meta) {
    if (currentLevelPriority <= LOG_LEVELS.error) {
      console.error(formatLog('error', message, meta));
    }
  },
};

module.exports = logger;
