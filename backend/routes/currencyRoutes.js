const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const currencyService = require('../services/currencyService');
const { success, error } = require('../utilities/responseHelper');

function createCurrencyRoutes(db) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const currencies = await currencyService.getAll(db);
      return success(res, currencies);
    } catch (err) {
      return error(res, 'Failed to get currencies');
    }
  });

  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { currency_name } = req.body;
      if (!currency_name) {
        return error(res, 'currency_name is required', 400);
      }
      const result = await currencyService.create(db, { currency_name });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create currency');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await currencyService.softDelete(db, parseInt(req.params.id));
      if (result.changes === 0) {
        return error(res, 'Currency not found', 404);
      }
      return success(res, { message: 'Currency deleted' });
    } catch (err) {
      return error(res, 'Failed to delete currency');
    }
  });

  return router;
}

module.exports = createCurrencyRoutes;
