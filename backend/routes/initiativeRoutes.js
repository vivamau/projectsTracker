const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const initiativeService = require('../services/initiativeService');
const { success, error } = require('../utilities/responseHelper');

function createInitiativeRoutes(db) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const initiatives = await initiativeService.getAll(db);
      return success(res, initiatives);
    } catch (err) {
      return error(res, 'Failed to list initiatives');
    }
  });

  router.get('/:id', authenticate, async (req, res) => {
    try {
      const initiative = await initiativeService.getById(db, parseInt(req.params.id));
      if (!initiative) return error(res, 'Initiative not found', 404);
      return success(res, initiative);
    } catch (err) {
      return error(res, 'Failed to get initiative');
    }
  });

  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { initiative_name } = req.body;
      if (!initiative_name) return error(res, 'initiative_name is required', 400);
      const result = await initiativeService.create(db, req.body);
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create initiative');
    }
  });

  router.put('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await initiativeService.getById(db, id);
      if (!existing) return error(res, 'Initiative not found', 404);
      await initiativeService.update(db, id, req.body);
      return success(res, { message: 'Initiative updated' });
    } catch (err) {
      return error(res, 'Failed to update initiative');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await initiativeService.softDelete(db, parseInt(req.params.id));
      if (result.changes === 0) return error(res, 'Initiative not found', 404);
      return success(res, { message: 'Initiative deleted' });
    } catch (err) {
      return error(res, 'Failed to delete initiative');
    }
  });

  return router;
}

module.exports = createInitiativeRoutes;
