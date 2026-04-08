const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const appSettingsService = require('../services/appSettingsService');
const { success, error } = require('../utilities/responseHelper');

function createSettingsRoutes(db) {
  const router = express.Router();

  router.get('/public/:key', authenticate, async (req, res) => {
    try {
      const value = await appSettingsService.get(db, req.params.key);
      return success(res, { key: req.params.key, value });
    } catch (err) {
      return error(res, 'Failed to get setting');
    }
  });

  router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const settings = await appSettingsService.getAll(db);
      return success(res, settings);
    } catch (err) {
      return error(res, 'Failed to get settings');
    }
  });

  router.put('/:key', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { value } = req.body;
      if (value === undefined || value === null) {
        return error(res, 'value is required', 400);
      }
      await appSettingsService.set(db, req.params.key, String(value), req.user.email);
      const setting = await appSettingsService.getWithMeta(db, req.params.key);
      return success(res, setting);
    } catch (err) {
      return error(res, 'Failed to update setting');
    }
  });

  return router;
}

module.exports = createSettingsRoutes;
