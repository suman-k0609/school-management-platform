/**
 * Audit Service Module
 * Handles recording and querying audit logs for compliance, security, and traceability.
 */
const { getPool, isInMemory, memoryStore } = require('../db');
const logger = require('../config/logger');

class AuditService {
  /**
   * Log an operational or security-sensitive event
   */
  async logEvent({
    action,
    userId,
    userRole,
    resourceType,
    resourceId,
    status,
    ipAddress,
    details,
  }) {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date();

    const auditEntry = {
      id,
      action,
      user_id: userId,
      user_role: userRole || 'unknown',
      resource_type: resourceType,
      resource_id: resourceId || null,
      status: status || 'SUCCESS',
      ip_address: ipAddress || null,
      details: details || {},
      created_at: timestamp,
    };

    try {
      if (isInMemory()) {
        memoryStore.auditLogs.unshift(auditEntry);
        // Keep in-memory logs bounded to last 1000 items
        if (memoryStore.auditLogs.length > 1000) {
          memoryStore.auditLogs.pop();
        }
      } else {
        const pool = getPool();
        await pool.query(
          `INSERT INTO audit_logs (id, action, user_id, user_role, resource_type, resource_id, status, ip_address, details, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            auditEntry.id,
            auditEntry.action,
            auditEntry.user_id,
            auditEntry.user_role,
            auditEntry.resource_type,
            auditEntry.resource_id,
            auditEntry.status,
            auditEntry.ip_address,
            JSON.stringify(auditEntry.details),
            auditEntry.created_at,
          ]
        );
      }
      logger.info('Audit event logged', {
        action,
        userId,
        status,
        resourceType,
        resourceId,
      });
      return auditEntry;
    } catch (err) {
      logger.error('Failed to write audit log', err);
      // We don't fail user requests solely because audit insert threw an exception,
      // but we log it as an error for observability.
      return null;
    }
  }

  /**
   * List recent audit logs
   */
  async listLogs({ limit = 50, action = null, status = null } = {}) {
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    if (isInMemory()) {
      let filtered = [...memoryStore.auditLogs];
      if (action) {
        filtered = filtered.filter((log) => log.action === action);
      }
      if (status) {
        filtered = filtered.filter((log) => log.status === status);
      }
      return filtered.slice(0, parsedLimit);
    }

    const pool = getPool();
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(action);
    }
    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parsedLimit);

    const query = `
      SELECT id, action, user_id, user_role, resource_type, resource_id, status, ip_address, details, created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = new AuditService();
