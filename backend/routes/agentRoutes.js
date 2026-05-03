const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const agentService = require('../services/agentService');
const aiTokenLogService = require('../services/aiTokenLogService');
const { success, error } = require('../utilities/responseHelper');

function createAgentRoutes(db, auditDb) {
  const router = express.Router();

  router.get('/settings', authenticate, async (req, res) => {
    try {
      const settings = await agentService.getSettings(db);
      return success(res, settings);
    } catch (err) {
      return error(res, 'Failed to get agent settings');
    }
  });

  router.put('/settings', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
    try {
      await agentService.updateSettings(db, req.body);
      const updated = await agentService.getSettings(db);
      return success(res, updated);
    } catch (err) {
      return error(res, 'Failed to update agent settings');
    }
  });

  router.get('/models', authenticate, async (req, res) => {
    try {
      const settings = await agentService.getSettings(db);
      const models = await agentService.getOllamaModels(settings.ollama_url, settings.ollama_api_key);
      return success(res, models);
    } catch (err) {
      return success(res, []);
    }
  });

  router.post('/chat', authenticate, async (req, res) => {
    const { message, history, sessionId } = req.body;
    if (!message || !message.trim()) {
      return error(res, 'Message is required', 400);
    }
    try {
      const result = await agentService.chat(db, { message: message.trim(), history: history || [] });

      if (auditDb && sessionId) {
        aiTokenLogService.logTokens(auditDb, {
          userId: req.user?.id,
          userEmail: req.user?.email,
          sessionId,
          model: result.model,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          messagePreview: message.trim(),
        }).catch(() => {});
      }

      return success(res, { role: result.role, content: result.content });
    } catch (err) {
      return error(res, err.message || 'Chat failed');
    }
  });

  // ── Token log endpoints (superadmin only) ──────────────────────────────────

  router.get('/token-logs/stats', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { user, model, date_from, date_to } = req.query;
      const filters = {};
      if (user)      filters.userEmail = user;
      if (model)     filters.model     = model;
      if (date_from) filters.dateFrom  = parseInt(date_from);
      if (date_to)   filters.dateTo    = parseInt(date_to);
      const stats = await aiTokenLogService.getStats(auditDb, filters);
      return success(res, stats);
    } catch (err) {
      return error(res, 'Failed to get token log stats');
    }
  });

  router.get('/token-logs/sessions/:sessionId', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const messages = await aiTokenLogService.getMessages(auditDb, req.params.sessionId);
      return success(res, messages);
    } catch (err) {
      return error(res, 'Failed to get session messages');
    }
  });

  router.get('/token-logs', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { user, model, date_from, date_to, page, limit } = req.query;
      const filters = {};
      if (user)      filters.userEmail = user;
      if (model)     filters.model     = model;
      if (date_from) filters.dateFrom  = parseInt(date_from);
      if (date_to)   filters.dateTo    = parseInt(date_to);

      const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 50 };

      const [sessions, total] = await Promise.all([
        aiTokenLogService.getSessions(auditDb, filters, pagination),
        aiTokenLogService.getSessionCount(auditDb, filters),
      ]);

      return success(res, { sessions, total, page: pagination.page, limit: pagination.limit });
    } catch (err) {
      return error(res, 'Failed to get token logs');
    }
  });

  return router;
}

module.exports = createAgentRoutes;
