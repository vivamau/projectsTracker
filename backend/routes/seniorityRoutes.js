const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const seniorityService = require('../services/seniorityService');
const { success, error } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');

function createSeniorityRoutes(db, auditDb) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const seniorities = await seniorityService.getAll(db);
      return success(res, seniorities);
    } catch (err) {
      return error(res, 'Failed to get seniorities');
    }
  });

  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { seniority_description } = req.body;
      if (!seniority_description) {
        return error(res, 'seniority_description is required', 400);
      }
      const result = await seniorityService.create(db, { seniority_description });
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'seniority.create',
        entityType: 'seniority',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create seniority');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await seniorityService.softDelete(db, id);
      if (result.changes === 0) {
        return error(res, 'Seniority not found', 404);
      }
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'seniority.delete',
        entityType: 'seniority',
        entityId: id,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Seniority deleted' });
    } catch (err) {
      return error(res, 'Failed to delete seniority');
    }
  });

  return router;
}

module.exports = createSeniorityRoutes;
