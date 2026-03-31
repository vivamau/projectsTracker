const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const vendorContractRoleService = require('../services/vendorContractRoleService');
const vendorRoleRateRoutes = require('./vendorRoleRateRoutes');
const { success, error } = require('../utilities/responseHelper');

function createVendorContractRoleRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // Nested vendor role rates routes
  router.use('/:roleId/rates', vendorRoleRateRoutes(db));

  // Get roles for a contract
  router.get('/', authenticate, async (req, res) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const roles = await vendorContractRoleService.getByContractId(db, contractId);
      return success(res, roles);
    } catch (err) {
      return error(res, 'Failed to get roles');
    }
  });

  // Get specific role
  router.get('/:roleId', authenticate, async (req, res) => {
    try {
      const role = await vendorContractRoleService.getById(db, parseInt(req.params.roleId));
      if (!role) return error(res, 'Role not found', 404);
      return success(res, role);
    } catch (err) {
      return error(res, 'Failed to get role');
    }
  });

  // Create role
  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { vendorcontractrole_name } = req.body;
      if (!vendorcontractrole_name) return error(res, 'vendorcontractrole_name is required', 400);

      const result = await vendorContractRoleService.create(db, {
        ...req.body,
        vendorcontract_id: parseInt(req.params.contractId)
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create role');
    }
  });

  // Update role
  router.put('/:roleId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await vendorContractRoleService.update(db, parseInt(req.params.roleId), req.body);
      if (result.changes === 0) return error(res, 'Role not found', 404);
      return success(res, { message: 'Role updated' });
    } catch (err) {
      return error(res, 'Failed to update role');
    }
  });

  // Delete role
  router.delete('/:roleId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await vendorContractRoleService.softDelete(db, parseInt(req.params.roleId));
      if (result.changes === 0) return error(res, 'Role not found', 404);
      return success(res, { message: 'Role deleted' });
    } catch (err) {
      return error(res, 'Failed to delete role');
    }
  });

  return router;
}

module.exports = createVendorContractRoleRoutes;
