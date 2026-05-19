const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ragService = require('../services/ragService');
const { success, error } = require('../utilities/responseHelper');

function createRagRoutes(db) {
  const router = express.Router();

  router.get('/settings', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const settings = await ragService.getSettings(db);
      return success(res, settings);
    } catch (err) {
      return error(res, 'Failed to get RAG settings');
    }
  });

  router.put('/settings', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      await ragService.saveSettings(db, { embeddingModel: req.body.embeddingModel });
      const settings = await ragService.getSettings(db);
      return success(res, settings);
    } catch (err) {
      return error(res, 'Failed to update RAG settings');
    }
  });

  router.get('/health', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { ollamaUrl, embeddingModel } = await ragService.getSettings(db);
      const health = await ragService.checkHealth(ollamaUrl, embeddingModel);
      return success(res, health);
    } catch (err) {
      return error(res, 'Failed to check RAG health');
    }
  });

  router.post('/learn', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const result = await ragService.runLearningPhase(db);
      return success(res, result);
    } catch (err) {
      return error(res, err.message || 'Learning phase failed');
    }
  });

  return router;
}

module.exports = createRagRoutes;
