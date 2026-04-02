const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const deliveryPathService = require('../services/deliveryPathService');
const { success, error } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');

function createDeliveryPathRoutes(db, auditDb) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const paths = await deliveryPathService.getAll(db);
      return success(res, paths);
    } catch (err) {
      return error(res, 'Failed to list delivery paths');
    }
  });

  router.get('/:id', authenticate, async (req, res) => {
    try {
      const dp = await deliveryPathService.getById(db, parseInt(req.params.id));
      if (!dp) return error(res, 'Delivery path not found', 404);
      return success(res, dp);
    } catch (err) {
      return error(res, 'Failed to get delivery path');
    }
  });

  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { deliverypath_name } = req.body;
      if (!deliverypath_name) return error(res, 'deliverypath_name is required', 400);
      const result = await deliveryPathService.create(db, req.body);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'delivery_path.create',
        entityType: 'delivery_path',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create delivery path');
    }
  });

  router.put('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await deliveryPathService.getById(db, id);
      if (!existing) return error(res, 'Delivery path not found', 404);
      await deliveryPathService.update(db, id, req.body);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'delivery_path.update',
        entityType: 'delivery_path',
        entityId: id,
        details: { before: existing, after: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Delivery path updated' });
    } catch (err) {
      return error(res, 'Failed to update delivery path');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await deliveryPathService.softDelete(db, id);
      if (result.changes === 0) return error(res, 'Delivery path not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'delivery_path.delete',
        entityType: 'delivery_path',
        entityId: id,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Delivery path deleted' });
    } catch (err) {
      return error(res, 'Failed to delete delivery path');
    }
  });

  return router;
}

module.exports = createDeliveryPathRoutes;
