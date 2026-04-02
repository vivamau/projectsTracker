const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const vendorService = require('../services/vendorService');
const vendorResourceService = require('../services/vendorResourceService');
const vendorContractRoutes = require('./vendorContractRoutes');
const { success, error } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');

function createVendorRoutes(db, auditDb) {
  const router = express.Router();

  router.use('/:vendorId/contracts', vendorContractRoutes(db, auditDb));

  router.get('/', authenticate, async (req, res) => {
    try {
      const vendors = await vendorService.getAll(db);
      return success(res, vendors);
    } catch (err) {
      return error(res, 'Failed to list vendors');
    }
  });

  router.get('/:vendorId/resources/:resourceId/projects', authenticate, async (req, res) => {
    try {
      const projects = await vendorResourceService.getProjects(db, parseInt(req.params.resourceId));
      return success(res, projects);
    } catch (err) {
      return error(res, 'Failed to get resource projects');
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
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'vendor.create',
        entityType: 'vendor',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
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
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'vendor.update',
        entityType: 'vendor',
        entityId: id,
        details: { before: existing, after: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Vendor updated' });
    } catch (err) {
      return error(res, 'Failed to update vendor');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await vendorService.softDelete(db, id);
      if (result.changes === 0) return error(res, 'Vendor not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'vendor.delete',
        entityType: 'vendor',
        entityId: id,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Vendor deleted' });
    } catch (err) {
      return error(res, 'Failed to delete vendor');
    }
  });

  return router;
}

module.exports = createVendorRoutes;
