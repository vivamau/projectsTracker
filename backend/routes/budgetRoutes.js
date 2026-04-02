const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const budgetService = require('../services/budgetService');
const purchaseOrderService = require('../services/purchaseOrderService');
const purchaseOrderItemService = require('../services/purchaseOrderItemService');
const poitemConsumptionService = require('../services/poitemConsumptionService');
const { success, error } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');

function createBudgetRoutes(db, auditDb) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const budgets = await budgetService.getAllBudgets(db);
      return success(res, budgets);
    } catch (err) {
      return error(res, 'Failed to get budgets');
    }
  });

  router.get('/recent', authenticate, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 5, 20);
      const budgets = await budgetService.getRecent(db, limit);
      return success(res, budgets);
    } catch (err) {
      return error(res, 'Failed to get recent budgets');
    }
  });

  router.get('/:id', authenticate, async (req, res) => {
    try {
      const budget = await budgetService.getById(db, parseInt(req.params.id));
      if (!budget) return error(res, 'Budget not found', 404);
      return success(res, budget);
    } catch (err) {
      return error(res, 'Failed to get budget');
    }
  });

  router.get('/:id/purchase-orders', authenticate, async (req, res) => {
    try {
      const pos = await purchaseOrderService.getByBudgetId(db, parseInt(req.params.id));
      return success(res, pos);
    } catch (err) {
      return error(res, 'Failed to get purchase orders');
    }
  });

  router.post('/:id/purchase-orders', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { purchaseorder_start_date } = req.body;
      if (!purchaseorder_start_date) return error(res, 'purchaseorder_start_date is required', 400);

      const result = await purchaseOrderService.create(db, {
        ...req.body,
        budget_id: parseInt(req.params.id)
      });
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'purchase_order.create',
        entityType: 'purchase_order',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create purchase order');
    }
  });

  router.put('/:id/purchase-orders/:poId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await purchaseOrderService.update(db, parseInt(req.params.poId), req.body);
      if (result.changes === 0) return error(res, 'Purchase order not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'purchase_order.update',
        entityType: 'purchase_order',
        entityId: parseInt(req.params.poId),
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Purchase order updated' });
    } catch (err) {
      return error(res, 'Failed to update purchase order');
    }
  });

  router.delete('/:id/purchase-orders/:poId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const poId = parseInt(req.params.poId);
      const result = await purchaseOrderService.softDelete(db, poId);
      if (result.changes === 0) return error(res, 'Purchase order not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'purchase_order.delete',
        entityType: 'purchase_order',
        entityId: poId,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Purchase order deleted' });
    } catch (err) {
      return error(res, 'Failed to delete purchase order');
    }
  });

  router.get('/:id/purchase-orders/:poId/items', authenticate, async (req, res) => {
    try {
      const items = await purchaseOrderItemService.getByPoId(db, parseInt(req.params.poId));
      return success(res, items);
    } catch (err) {
      return error(res, 'Failed to get purchase order items');
    }
  });

  router.post('/:id/purchase-orders/:poId/items', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { purchaseorderitem_start_date } = req.body;
      if (!purchaseorderitem_start_date) return error(res, 'purchaseorderitem_start_date is required', 400);

      const result = await purchaseOrderItemService.create(db, {
        ...req.body,
        purchaseorder_id: parseInt(req.params.poId)
      });
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'purchase_order_item.create',
        entityType: 'purchase_order_item',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create purchase order item');
    }
  });

  router.put('/:id/purchase-orders/:poId/items/:itemId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await purchaseOrderItemService.update(db, parseInt(req.params.itemId), req.body);
      if (result.changes === 0) return error(res, 'Item not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'purchase_order_item.update',
        entityType: 'purchase_order_item',
        entityId: parseInt(req.params.itemId),
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Purchase order item updated' });
    } catch (err) {
      return error(res, 'Failed to update purchase order item');
    }
  });

  router.delete('/:id/purchase-orders/:poId/items/:itemId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const result = await purchaseOrderItemService.softDelete(db, itemId);
      if (result.changes === 0) return error(res, 'Item not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'purchase_order_item.delete',
        entityType: 'purchase_order_item',
        entityId: itemId,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Purchase order item deleted' });
    } catch (err) {
      return error(res, 'Failed to delete purchase order item');
    }
  });

  router.get('/:id/purchase-orders/:poId/items/:itemId/consumptions', authenticate, async (req, res) => {
    try {
      const summary = await poitemConsumptionService.getByItemIdWithSummary(db, parseInt(req.params.itemId));
      return success(res, summary);
    } catch (err) {
      return error(res, 'Failed to get consumptions');
    }
  });

  router.post('/:id/purchase-orders/:poId/items/:itemId/consumptions', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { consumption_month, consumption_days } = req.body;
      if (!consumption_month) return error(res, 'consumption_month is required', 400);
      if (consumption_days === undefined || consumption_days === null) return error(res, 'consumption_days is required', 400);
      if (consumption_days < 0) return error(res, 'consumption_days must be non-negative', 400);

      const result = await poitemConsumptionService.create(db, {
        purchaseorderitem_id: parseInt(req.params.itemId),
        consumption_month,
        consumption_days,
        consumption_comment: req.body.consumption_comment,
        user_id: req.user.id
      });
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'consumption.create',
        entityType: 'consumption',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return error(res, 'A consumption entry already exists for this month', 409);
      }
      return error(res, 'Failed to create consumption entry');
    }
  });

  router.put('/:id/purchase-orders/:poId/items/:itemId/consumptions/:consumptionId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await poitemConsumptionService.update(db, parseInt(req.params.consumptionId), req.body);
      if (result.changes === 0) return error(res, 'Consumption entry not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'consumption.update',
        entityType: 'consumption',
        entityId: parseInt(req.params.consumptionId),
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Consumption entry updated' });
    } catch (err) {
      return error(res, 'Failed to update consumption entry');
    }
  });

  router.delete('/:id/purchase-orders/:poId/items/:itemId/consumptions/:consumptionId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const consumptionId = parseInt(req.params.consumptionId);
      const result = await poitemConsumptionService.softDelete(db, consumptionId);
      if (result.changes === 0) return error(res, 'Consumption entry not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'consumption.delete',
        entityType: 'consumption',
        entityId: consumptionId,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Consumption entry deleted' });
    } catch (err) {
      return error(res, 'Failed to delete consumption entry');
    }
  });

  return router;
}

module.exports = createBudgetRoutes;
