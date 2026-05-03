const express = require('express');
const { authenticate } = require('../middleware/auth');
const purchaseOrderService = require('../services/purchaseOrderService');
const { success, error } = require('../utilities/responseHelper');

function createPurchaseOrderRoutes(db) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'start_date';
      const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
      const result = await purchaseOrderService.getAllPaginated(db, { page, limit, search, sortBy, sortDir });
      return success(res, result);
    } catch (err) {
      return error(res, 'Failed to get purchase orders');
    }
  });

  return router;
}

module.exports = createPurchaseOrderRoutes;
