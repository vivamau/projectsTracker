const express = require('express');
const cookieParser = require('cookie-parser');
const createRoutes = require('../../routes');

function createTestApp(db) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', createRoutes(db));
  return app;
}

module.exports = { createTestApp };
