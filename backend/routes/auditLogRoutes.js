const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const auditLogService = require('../services/auditLogService');
const appSettingsService = require('../services/appSettingsService');
const { success, error } = require('../utilities/responseHelper');

function createAuditLogRoutes(db, auditDb) {
  const router = express.Router();

  router.get('/filters', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const [actions, entityTypes, userEmails] = await Promise.all([
        auditLogService.getActionTypes(auditDb),
        auditLogService.getEntityTypes(auditDb),
        auditLogService.getUserEmails(auditDb)
      ]);
      return success(res, { actions, entityTypes, userEmails });
    } catch (err) {
      return error(res, 'Failed to get filter options');
    }
  });

  router.get('/stats', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const stats = await auditLogService.getStats(auditDb);
      return success(res, stats);
    } catch (err) {
      return error(res, 'Failed to get stats');
    }
  });

  router.post('/cleanup', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { retentionDays } = req.body;
      const days = retentionDays || await appSettingsService.get(db, 'audit_retention_days') || 90;
      const deleted = await auditLogService.cleanup(auditDb, days);
      return success(res, { deleted });
    } catch (err) {
      return error(res, 'Failed to cleanup logs');
    }
  });

  router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { user, action, entity_type, date_from, date_to, search, page, limit } = req.query;

      const filters = {};
      if (user) filters.userEmail = user;
      if (action) filters.action = action;
      if (entity_type) filters.entityType = entity_type;
      if (date_from) filters.dateFrom = parseInt(date_from);
      if (date_to) filters.dateTo = parseInt(date_to);
      if (search) filters.search = search;

      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50
      };

      const [logs, total] = await Promise.all([
        auditLogService.getLogs(auditDb, filters, pagination),
        auditLogService.getLogCount(auditDb, filters)
      ]);

      return success(res, { logs, total, page: pagination.page, limit: pagination.limit });
    } catch (err) {
      return error(res, 'Failed to get audit logs');
    }
  });

  return router;
}

module.exports = createAuditLogRoutes;
