const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const vendorContractRoleService = require('../services/vendorContractRoleService');
const vendorRoleRateRoutes = require('./vendorRoleRateRoutes');
const { success, error } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');

function createVendorContractRoleRoutes(db, auditDb) {
  const router = express.Router({ mergeParams: true });

  router.use('/:roleId/rates', vendorRoleRateRoutes(db, auditDb));

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

  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { vendorcontractrole_name } = req.body;
      if (!vendorcontractrole_name) return error(res, 'vendorcontractrole_name is required', 400);

      const result = await vendorContractRoleService.create(db, {
        ...req.body,
        vendorcontract_id: parseInt(req.params.contractId)
      });
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'vendor_contract_role.create',
        entityType: 'vendor_contract_role',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create role');
    }
  });

  router.put('/:roleId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const result = await vendorContractRoleService.update(db, roleId, req.body);
      if (result.changes === 0) return error(res, 'Role not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'vendor_contract_role.update',
        entityType: 'vendor_contract_role',
        entityId: roleId,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Role updated' });
    } catch (err) {
      return error(res, 'Failed to update role');
    }
  });

  router.delete('/:roleId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const result = await vendorContractRoleService.softDelete(db, roleId);
      if (result.changes === 0) return error(res, 'Role not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'vendor_contract_role.delete',
        entityType: 'vendor_contract_role',
        entityId: roleId,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Role deleted' });
    } catch (err) {
      return error(res, 'Failed to delete role');
    }
  });

  return router;
}

module.exports = createVendorContractRoleRoutes;
