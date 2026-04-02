const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const vendorRoleRateService = require('../services/vendorRoleRateService');
const { success, error } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');

function createVendorRoleRateRoutes(db, auditDb) {
  const router = express.Router({ mergeParams: true });

  // Get rates for a role
  router.get('/', authenticate, async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const rates = await vendorRoleRateService.getByRoleId(db, roleId);
      return success(res, rates);
    } catch (err) {
      return error(res, 'Failed to get rates');
    }
  });

  // Get specific rate
  router.get('/:rateId', authenticate, async (req, res) => {
    try {
      const rate = await vendorRoleRateService.getById(db, parseInt(req.params.rateId));
      if (!rate) return error(res, 'Rate not found', 404);
      return success(res, rate);
    } catch (err) {
      return error(res, 'Failed to get rate');
    }
  });

  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { vendorrolerate_rate, currency_id } = req.body;
      if (!vendorrolerate_rate) return error(res, 'vendorrolerate_rate is required', 400);
      if (!currency_id) return error(res, 'currency_id is required', 400);

      const result = await vendorRoleRateService.create(db, {
        ...req.body,
        vendorcontractrole_id: parseInt(req.params.roleId)
      });
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'vendor_role_rate.create',
        entityType: 'vendor_role_rate',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create rate');
    }
  });

  router.put('/:rateId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const rateId = parseInt(req.params.rateId);
      const result = await vendorRoleRateService.update(db, rateId, req.body);
      if (result.changes === 0) return error(res, 'Rate not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'vendor_role_rate.update',
        entityType: 'vendor_role_rate',
        entityId: rateId,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Rate updated' });
    } catch (err) {
      return error(res, 'Failed to update rate');
    }
  });

  router.delete('/:rateId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const rateId = parseInt(req.params.rateId);
      const result = await vendorRoleRateService.softDelete(db, rateId);
      if (result.changes === 0) return error(res, 'Rate not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'vendor_role_rate.delete',
        entityType: 'vendor_role_rate',
        entityId: rateId,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Rate deleted' });
    } catch (err) {
      return error(res, 'Failed to delete rate');
    }
  });

  return router;
}

module.exports = createVendorRoleRateRoutes;
