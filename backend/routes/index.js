const express = require('express');
const createAuthRoutes = require('./authRoutes');
const createProjectRoutes = require('./projectRoutes');
const createDivisionRoutes = require('./divisionRoutes');
const createUserRoutes = require('./userRoutes');
const createCountryRoutes = require('./countryRoutes');
const createInitiativeRoutes = require('./initiativeRoutes');
const createDeliveryPathRoutes = require('./deliveryPathRoutes');
const createCurrencyRoutes = require('./currencyRoutes');
const createBudgetRoutes = require('./budgetRoutes');

function createRoutes(db) {
  const router = express.Router();

  router.use('/auth', createAuthRoutes(db));
  router.use('/projects', createProjectRoutes(db));
  router.use('/divisions', createDivisionRoutes(db));
  router.use('/users', createUserRoutes(db));
  router.use('/countries', createCountryRoutes(db));
  router.use('/currencies', createCurrencyRoutes(db));
  router.use('/budgets', createBudgetRoutes(db));
  router.use('/initiatives', createInitiativeRoutes(db));
  router.use('/deliverypaths', createDeliveryPathRoutes(db));

  return router;
}

module.exports = createRoutes;
