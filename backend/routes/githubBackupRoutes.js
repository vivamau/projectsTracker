const express = require('express');
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth');
const githubBackupService = require('../services/githubBackupService');
const auditHelper = require('../utilities/auditHelper');
const { success, error } = require('../utilities/responseHelper');

function createGithubBackupRoutes(db, auditDb) {
  const router = express.Router();

  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

  router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const settings = await githubBackupService.getSettings(db);
      const safeSettings = { ...settings, token: settings.token ? '••••••••' : '' };
      return success(res, safeSettings);
    } catch (err) {
      return error(res, 'Failed to load backup settings');
    }
  });

  router.put('/settings', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { enabled, token, repo, branch } = req.body;
      const payload = { enabled };
      if (token  !== undefined && token !== '••••••••') payload.token  = token;
      if (repo   !== undefined) payload.repo   = repo;
      if (branch !== undefined) payload.branch = branch;
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
      const result = await githubBackupService.syncAll(db, dataDir, auditDb);
      await auditHelper.auditLog(auditDb, {
        userId:     req.user.id,
        userEmail:  req.user.email,
        action:     'github_backup.sync',
        entityType: 'github_backup',
        entityId:   null,
        details: {
          pushed:         result.pushed,
          pulled:         result.pulled,
          commitSha:      result.commitSha,
          requiresRestart: result.requiresRestart,
        },
        ip: req.ip,
      });
      return success(res, result);
    } catch (err) {
      await githubBackupService.recordFailure(db, err.message).catch(() => {});
      return error(res, err.message || 'Sync failed', 500);
    }
  });

  return router;
}

module.exports = createGithubBackupRoutes;
