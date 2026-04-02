const express = require('express');
const cookieParser = require('cookie-parser');
const createRoutes = require('../../routes');
const { createAuditDb } = require('../../config/auditDatabase');

function createTestApp(db) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const auditDb = createAuditDb(':memory:');

  app.use('/api', createRoutes(db, auditDb));
  return app;
}

module.exports = { createTestApp };
