/**
 * Authentication and Role-Based Access Control (RBAC) Middleware
 * Resolves user identity from header credentials (e.g. x-user-id or x-role)
 * against the persistent database or active session store.
 */
const { getPool, isInMemory, memoryStore } = require('../db');
const auditService = require('../services/auditService');

async function authenticate(req, res, next) {
  const userId = req.headers['x-user-id'];
  const explicitRole = req.headers['x-role'];

  if (!userId && !explicitRole) {
    req.user = null;
    return next();
  }

  try {
    let user = null;

    if (userId) {
      if (isInMemory()) {
        user = memoryStore.users.get(userId);
      } else {
        const pool = getPool();
        const result = await pool.query(
          'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
          [userId]
        );
        user = result.rows[0] || null;
      }
    }

    if (!user && userId && explicitRole) {
      // Ephemeral / fallback context if testing with arbitrary user ID and explicit role
      user = {
        id: userId,
        name: `User ${userId}`,
        email: `${userId}@school.edu`,
        role: explicitRole,
      };
    } else if (!user && explicitRole) {
      user = {
        id: `ephemeral-${explicitRole}`,
        name: `Anonymous ${explicitRole}`,
        email: `anon-${explicitRole}@school.edu`,
        role: explicitRole,
      };
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware factory ensuring authenticated user has one of the allowed roles
 */
function requireRole(allowedRoles = []) {
  return async (req, res, next) => {
    if (!req.user) {
      await auditService.logEvent({
        action: 'ACCESS_DENIED_UNAUTHENTICATED',
        userId: 'anonymous',
        userRole: 'none',
        resourceType: 'endpoint',
        resourceId: req.originalUrl,
        status: 'FORBIDDEN',
        ipAddress: req.ip,
        details: { path: req.originalUrl, method: req.method },
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message:
            'Authentication credentials (X-User-ID or X-Role header) required for this action',
        },
        requestId: req.id,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      await auditService.logEvent({
        action: 'ACCESS_DENIED_INSUFFICIENT_ROLE',
        userId: req.user.id,
        userRole: req.user.role,
        resourceType: 'endpoint',
        resourceId: req.originalUrl,
        status: 'FORBIDDEN',
        ipAddress: req.ip,
        details: {
          path: req.originalUrl,
          method: req.method,
          requiredRoles: allowedRoles,
          userRole: req.user.role,
        },
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Access denied. Role '${req.user.role}' is not authorized. Required: ${allowedRoles.join(', ')}`,
        },
        requestId: req.id,
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};
