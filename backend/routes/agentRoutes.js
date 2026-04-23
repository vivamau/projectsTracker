const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const agentService = require('../services/agentService');
const { success, error } = require('../utilities/responseHelper');

function createAgentRoutes(db) {
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
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return error(res, 'Message is required', 400);
    }
    try {
      const result = await agentService.chat(db, { message: message.trim(), history: history || [] });
      return success(res, result);
    } catch (err) {
      return error(res, err.message || 'Chat failed');
    }
  });

  return router;
}

module.exports = createAgentRoutes;
