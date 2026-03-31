const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const vendorRoleRateService = require('../services/vendorRoleRateService');
const { success, error } = require('../utilities/responseHelper');

function createVendorRoleRateRoutes(db) {
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

  // Create rate
  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { vendorrolerate_rate, currency_id } = req.body;
      if (!vendorrolerate_rate) return error(res, 'vendorrolerate_rate is required', 400);
      if (!currency_id) return error(res, 'currency_id is required', 400);

      const result = await vendorRoleRateService.create(db, {
        ...req.body,
        vendorcontractrole_id: parseInt(req.params.roleId)
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create rate');
    }
  });

  // Update rate
  router.put('/:rateId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await vendorRoleRateService.update(db, parseInt(req.params.rateId), req.body);
      if (result.changes === 0) return error(res, 'Rate not found', 404);
      return success(res, { message: 'Rate updated' });
    } catch (err) {
      return error(res, 'Failed to update rate');
    }
  });

  // Delete rate
  router.delete('/:rateId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await vendorRoleRateService.softDelete(db, parseInt(req.params.rateId));
      if (result.changes === 0) return error(res, 'Rate not found', 404);
      return success(res, { message: 'Rate deleted' });
    } catch (err) {
      return error(res, 'Failed to delete rate');
    }
  });

  return router;
}

module.exports = createVendorRoleRateRoutes;
