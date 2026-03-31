const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const seniorityService = require('../services/seniorityService');
const { success, error } = require('../utilities/responseHelper');

function createSeniorityRoutes(db) {
  const router = express.Router();

  // Get all seniorities
  router.get('/', authenticate, async (req, res) => {
    try {
      const seniorities = await seniorityService.getAll(db);
      return success(res, seniorities);
    } catch (err) {
      return error(res, 'Failed to get seniorities');
    }
  });

  // Create seniority
  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { seniority_description } = req.body;
      if (!seniority_description) {
        return error(res, 'seniority_description is required', 400);
      }
      const result = await seniorityService.create(db, { seniority_description });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create seniority');
    }
  });

  // Delete seniority
  router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await seniorityService.softDelete(db, parseInt(req.params.id));
      if (result.changes === 0) {
        return error(res, 'Seniority not found', 404);
      }
      return success(res, { message: 'Seniority deleted' });
    } catch (err) {
      return error(res, 'Failed to delete seniority');
    }
  });

  return router;
}

module.exports = createSeniorityRoutes;
