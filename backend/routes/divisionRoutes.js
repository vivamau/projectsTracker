const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const divisionService = require('../services/divisionService');
const { success, error } = require('../utilities/responseHelper');

function createDivisionRoutes(db) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const divisions = await divisionService.getAll(db);
      return success(res, divisions);
    } catch (err) {
      return error(res, 'Failed to list divisions');
    }
  });

  router.get('/:id', authenticate, async (req, res) => {
    try {
      const division = await divisionService.getById(db, parseInt(req.params.id));
      if (!division) return error(res, 'Division not found', 404);
      return success(res, division);
    } catch (err) {
      return error(res, 'Failed to get division');
    }
  });

  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { division_name } = req.body;
      if (!division_name) return error(res, 'division_name is required', 400);
      const result = await divisionService.create(db, { division_name });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create division');
    }
  });

  router.put('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await divisionService.getById(db, id);
      if (!existing) return error(res, 'Division not found', 404);
      await divisionService.update(db, id, req.body);
      return success(res, { message: 'Division updated' });
    } catch (err) {
      return error(res, 'Failed to update division');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await divisionService.softDelete(db, parseInt(req.params.id));
      if (result.changes === 0) return error(res, 'Division not found', 404);
      return success(res, { message: 'Division deleted' });
    } catch (err) {
      return error(res, 'Failed to delete division');
    }
  });

  return router;
}

module.exports = createDivisionRoutes;
