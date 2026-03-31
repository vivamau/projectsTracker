const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const vendorContractService = require('../services/vendorContractService');
const vendorContractRoleRoutes = require('./vendorContractRoleRoutes');
const { success, error } = require('../utilities/responseHelper');

function createVendorContractRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // Nested vendor contract roles routes
  router.use('/:contractId/roles', vendorContractRoleRoutes(db));

  // Get contracts for a vendor
  router.get('/', authenticate, async (req, res) => {
    try {
      const vendorId = parseInt(req.params.vendorId);
      const contracts = await vendorContractService.getByVendorId(db, vendorId);
      return success(res, contracts);
    } catch (err) {
      return error(res, 'Failed to get contracts');
    }
  });

  // Get specific contract
  router.get('/:contractId', authenticate, async (req, res) => {
    try {
      const contract = await vendorContractService.getById(db, parseInt(req.params.contractId));
      if (!contract) return error(res, 'Contract not found', 404);
      return success(res, contract);
    } catch (err) {
      return error(res, 'Failed to get contract');
    }
  });

  // Create contract
  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { contract_name, contract_start_date } = req.body;
      if (!contract_name) return error(res, 'contract_name is required', 400);
      if (!contract_start_date) return error(res, 'contract_start_date is required', 400);

      const result = await vendorContractService.create(db, {
        ...req.body,
        vendor_id: parseInt(req.params.vendorId)
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create contract');
    }
  });

  // Update contract
  router.put('/:contractId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await vendorContractService.update(db, parseInt(req.params.contractId), req.body);
      if (result.changes === 0) return error(res, 'Contract not found', 404);
      return success(res, { message: 'Contract updated' });
    } catch (err) {
      return error(res, 'Failed to update contract');
    }
  });

  // Delete contract
  router.delete('/:contractId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await vendorContractService.softDelete(db, parseInt(req.params.contractId));
      if (result.changes === 0) return error(res, 'Contract not found', 404);
      return success(res, { message: 'Contract deleted' });
    } catch (err) {
      return error(res, 'Failed to delete contract');
    }
  });

  return router;
}

module.exports = createVendorContractRoutes;
