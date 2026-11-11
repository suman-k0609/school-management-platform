/**
 * Audit Log Controller
 */
const auditService = require('../services/auditService');

async function listAuditLogs(req, res, next) {
  try {
    const { limit, action, status } = req.query;
    const logs = await auditService.listLogs({ limit, action, status });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAuditLogs,
};
