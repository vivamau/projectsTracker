const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getAll } = require('../config/database');
const { success, error } = require('../utilities/responseHelper');

function createProjectStatusRoutes(db) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const statuses = await getAll(db,
        `SELECT id, project_status_name, project_status_description
         FROM project_statuses
         WHERE project_status_is_deleted = 0
         ORDER BY project_status_name`
      );
      return success(res, statuses);
    } catch (err) {
      return error(res, 'Failed to get project statuses');
    }
  });

  return router;
}

module.exports = createProjectStatusRoutes;
