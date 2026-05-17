const express = require('express');
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth');
const githubBackupService = require('../services/githubBackupService');
const { success, error } = require('../utilities/responseHelper');

function createGithubBackupRoutes(db) {
  const router = express.Router();

  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'database.sqlite');

  router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const settings = await githubBackupService.getSettings(db);
      // Never expose the raw token to the client
      const safeSettings = { ...settings, token: settings.token ? '••••••••' : '' };
      return success(res, safeSettings);
    } catch (err) {
      return error(res, 'Failed to load backup settings');
    }
  });

  router.put('/settings', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { enabled, token, repo, branch, filePath } = req.body;
      const payload = { enabled };
      // Only update token if explicitly provided (not the masked placeholder)
      if (token !== undefined && token !== '••••••••') payload.token = token;
      if (repo     !== undefined) payload.repo     = repo;
      if (branch   !== undefined) payload.branch   = branch;
      if (filePath !== undefined) payload.filePath = filePath;
      await githubBackupService.saveSettings(db, payload, req.user.email);
      const settings = await githubBackupService.getSettings(db);
      return success(res, { ...settings, token: settings.token ? '••••••••' : '' });
    } catch (err) {
      return error(res, err.message || 'Failed to save backup settings');
    }
  });

  router.post('/test', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { token, repo } = req.body;
      // Allow testing with stored token if caller sends the masked placeholder
      let effectiveToken = token;
      if (!token || token === '••••••••') {
        const settings = await githubBackupService.getSettings(db);
        effectiveToken = settings.token;
      }
      const result = await githubBackupService.testConnection(effectiveToken, repo);
      return success(res, result);
    } catch (err) {
      return error(res, err.message || 'Connection test failed', 400);
    }
  });

  router.post('/sync', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const result = await githubBackupService.syncDatabase(db, dbPath);
      return success(res, result);
    } catch (err) {
      await githubBackupService.recordFailure(db, err.message).catch(() => {});
      return error(res, err.message || 'Sync failed', 500);
    }
  });

  return router;
}

module.exports = createGithubBackupRoutes;
