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
const createVendorRoutes = require('./vendorRoutes');
const createSeniorityRoutes = require('./seniorityRoutes');
const createSettingsRoutes = require('./settingsRoutes');
const createAuditLogRoutes = require('./auditLogRoutes');
const createProjectStatusRoutes = require('./projectStatusRoutes');
const createActivityRoutes = require('./activityRoutes');
const createTecStackRoutes = require('./tecStackRoutes');
const createHealthStatusTypeRoutes = require('./healthStatusTypeRoutes');
const createProjectRoleRoutes = require('./projectRoleRoutes');
const createAgentRoutes = require('./agentRoutes');
const createPurchaseOrderRoutes = require('./purchaseOrderRoutes');

function createRoutes(db, auditDb) {
  const router = express.Router();

  router.use('/auth', createAuthRoutes(db, auditDb));
  router.use('/projects', createProjectRoutes(db, auditDb));
  router.use('/divisions', createDivisionRoutes(db, auditDb));
  router.use('/users', createUserRoutes(db, auditDb));
  router.use('/countries', createCountryRoutes(db));
  router.use('/currencies', createCurrencyRoutes(db, auditDb));
  router.use('/budgets', createBudgetRoutes(db, auditDb));
  router.use('/vendors', createVendorRoutes(db, auditDb));
  router.use('/initiatives', createInitiativeRoutes(db, auditDb));
  router.use('/deliverypaths', createDeliveryPathRoutes(db, auditDb));
  router.use('/seniorities', createSeniorityRoutes(db, auditDb));
  router.use('/settings', createSettingsRoutes(db));
  router.use('/audit-logs', createAuditLogRoutes(db, auditDb));
  router.use('/project-statuses', createProjectStatusRoutes(db));
  router.use('/tec-stacks', createTecStackRoutes(db));
  router.use('/healthstatus-types', createHealthStatusTypeRoutes(db));
  router.use('/project-roles', createProjectRoleRoutes(db, auditDb));
  router.use('/agent', createAgentRoutes(db, auditDb));
  router.use('/purchase-orders', createPurchaseOrderRoutes(db));

  return router;
}

module.exports = createRoutes;
