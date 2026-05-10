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

  router.get('/:id/purchase-orders', authenticate, async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);
      const { getAll } = require('../config/database');

      const pos = await getAll(db, `
        SELECT po.id, po.purchaseorder_description, po.purchaseorder_start_date, po.purchaseorder_end_date,
               po.budget_id, p.id AS project_id, p.project_name,
               c.currency_name, s.purchaseorderstatus_name AS status_name
        FROM purchaseorders po
        JOIN projects_to_budgets pb ON po.budget_id = pb.budget_id
        JOIN projects p ON pb.project_id = p.id
        LEFT JOIN budgets b ON po.budget_id = b.id
        LEFT JOIN currencies c ON b.currency_id = c.id
        LEFT JOIN purchaseorderstatuses s ON po.purchaseorderitem_status_id = s.id
        WHERE po.vendor_id = ? AND (po.purchaseorder_is_deleted = 0 OR po.purchaseorder_is_deleted IS NULL)
        ORDER BY po.purchaseorder_start_date DESC, po.id DESC
      `, [vendorId]);

      if (pos.length === 0) return success(res, []);

      const poIds = pos.map(p => p.id);
      const placeholders = poIds.map(() => '?').join(',');
      const items = await getAll(db, `
        SELECT i.id, i.purchaseorder_id, i.purchaseorderitem_description,
               i.purchaseorderitems_days, i.purchaseorderitems_discounted_rate,
               i.purchaseorderitem_start_date, i.purchaseorderitem_end_date,
               c.currency_name AS item_currency,
               vcr.vendorcontractrole_name AS role_name,
               TRIM(vr.vendorresource_name || ' ' || COALESCE(vr.vendorresource_lastname,'')) AS resource_name
        FROM purchaseorderitems i
        LEFT JOIN currencies c ON i.currency_id = c.id
        LEFT JOIN vendorcontractroles vcr ON i.vendorcontractrole_id = vcr.id
        LEFT JOIN vendorresources vr ON i.vendorresource_id = vr.id
        WHERE i.purchaseorder_id IN (${placeholders})
          AND (i.purchaseorderitem_is_deleted = 0 OR i.purchaseorderitem_is_deleted IS NULL)
        ORDER BY i.id
      `, poIds);

      const itemsByPo = {};
      for (const item of items) {
        if (!itemsByPo[item.purchaseorder_id]) itemsByPo[item.purchaseorder_id] = [];
        itemsByPo[item.purchaseorder_id].push(item);
      }

      const result = pos.map(po => {
        const poItems = itemsByPo[po.id] || [];
        const total = poItems.reduce((sum, i) =>
          sum + (i.purchaseorderitems_days || 0) * (i.purchaseorderitems_discounted_rate || 0), 0);
        return { ...po, items: poItems, total };
      });

      return success(res, result);
    } catch (err) {
      return error(res, 'Failed to get purchase orders');
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
