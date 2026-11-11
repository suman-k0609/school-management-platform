/**
 * Express Application Setup
 * Configures security headers (Helmet), CORS, JSON parsing, structured logging, and routes.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const { requestLoggerMiddleware } = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const config = require('./config/env');

const app = express();

// Enable reverse proxy trust if deployed behind Nginx / Load Balancer
if (config.trustProxy) {
  app.set('trust proxy', 1);
}

// 1. Security Headers (Defense in depth)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// 2. Cross-Origin Resource Sharing
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Role', 'X-Request-ID'],
  })
);

// 3. Request Body Parsing (Restricted payload size to prevent DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 4. Request Correlation ID & Structured Logging Middleware
app.use(requestLoggerMiddleware);

// 5. Mount Application Routes
app.use(routes);

// 6. 404 Route Handler for undefined endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`,
    },
    requestId: req.id,
  });
});

// 7. Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
