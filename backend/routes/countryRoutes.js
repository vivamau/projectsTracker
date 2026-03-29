const express = require('express');
const { authenticate } = require('../middleware/auth');
const countryService = require('../services/countryService');
const { success, error } = require('../utilities/responseHelper');

function createCountryRoutes(db) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const search = req.query.search || '';
      const countries = await countryService.getAll(db, search);
      return success(res, countries);
    } catch (err) {
      return error(res, 'Failed to list countries');
    }
  });

  router.get('/:code', authenticate, async (req, res) => {
    try {
      const country = await countryService.getByCode(db, parseInt(req.params.code));
      if (!country) return error(res, 'Country not found', 404);
      return success(res, country);
    } catch (err) {
      return error(res, 'Failed to get country');
    }
  });

  return router;
}

module.exports = createCountryRoutes;
