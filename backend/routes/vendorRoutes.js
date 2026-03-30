const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const vendorService = require('../services/vendorService');
const { success, error } = require('../utilities/responseHelper');

function createVendorRoutes(db) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const vendors = await vendorService.getAll(db);
      return success(res, vendors);
    } catch (err) {
      return error(res, 'Failed to list vendors');
    }
  });

  router.get('/:id', authenticate, async (req, res) => {
    try {
      const vendor = await vendorService.getById(db, parseInt(req.params.id));
      if (!vendor) return error(res, 'Vendor not found', 404);
      return success(res, vendor);
    } catch (err) {
      return error(res, 'Failed to get vendor');
    }
  });

  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { vendor_name } = req.body;
      if (!vendor_name) return error(res, 'vendor_name is required', 400);
      const result = await vendorService.create(db, req.body);
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create vendor');
    }
  });

  router.put('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await vendorService.getById(db, id);
      if (!existing) return error(res, 'Vendor not found', 404);
      await vendorService.update(db, id, req.body);
      return success(res, { message: 'Vendor updated' });
    } catch (err) {
      return error(res, 'Failed to update vendor');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await vendorService.softDelete(db, parseInt(req.params.id));
      if (result.changes === 0) return error(res, 'Vendor not found', 404);
      return success(res, { message: 'Vendor deleted' });
    } catch (err) {
      return error(res, 'Failed to delete vendor');
    }
  });

  return router;
}

module.exports = createVendorRoutes;
