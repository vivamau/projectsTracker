const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const budgetService = require('../services/budgetService');
const purchaseOrderService = require('../services/purchaseOrderService');
const purchaseOrderItemService = require('../services/purchaseOrderItemService');
const { success, error } = require('../utilities/responseHelper');

function createBudgetRoutes(db) {
  const router = express.Router();

  // Get budget detail
  router.get('/:id', authenticate, async (req, res) => {
    try {
      const budget = await budgetService.getById(db, parseInt(req.params.id));
      if (!budget) return error(res, 'Budget not found', 404);
      return success(res, budget);
    } catch (err) {
      return error(res, 'Failed to get budget');
    }
  });

  // Purchase orders for a budget
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
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create purchase order');
    }
  });

  router.put('/:id/purchase-orders/:poId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await purchaseOrderService.update(db, parseInt(req.params.poId), req.body);
      if (result.changes === 0) return error(res, 'Purchase order not found', 404);
      return success(res, { message: 'Purchase order updated' });
    } catch (err) {
      return error(res, 'Failed to update purchase order');
    }
  });

  router.delete('/:id/purchase-orders/:poId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await purchaseOrderService.softDelete(db, parseInt(req.params.poId));
      if (result.changes === 0) return error(res, 'Purchase order not found', 404);
      return success(res, { message: 'Purchase order deleted' });
    } catch (err) {
      return error(res, 'Failed to delete purchase order');
    }
  });

  // Purchase order items
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
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create purchase order item');
    }
  });

  router.put('/:id/purchase-orders/:poId/items/:itemId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await purchaseOrderItemService.update(db, parseInt(req.params.itemId), req.body);
      if (result.changes === 0) return error(res, 'Item not found', 404);
      return success(res, { message: 'Purchase order item updated' });
    } catch (err) {
      return error(res, 'Failed to update purchase order item');
    }
  });

  router.delete('/:id/purchase-orders/:poId/items/:itemId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await purchaseOrderItemService.softDelete(db, parseInt(req.params.itemId));
      if (result.changes === 0) return error(res, 'Item not found', 404);
      return success(res, { message: 'Purchase order item deleted' });
    } catch (err) {
      return error(res, 'Failed to delete purchase order item');
    }
  });

  return router;
}

module.exports = createBudgetRoutes;
