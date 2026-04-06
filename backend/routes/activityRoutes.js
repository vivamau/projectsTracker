const express = require('express');
const { authenticate } = require('../middleware/auth');
const activityService = require('../services/activityService');
const { success, error } = require('../utilities/responseHelper');

function createActivityRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // GET /api/projects/:projectId/activities
  router.get('/', authenticate, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const activities = await activityService.getByProjectId(db, projectId);
      return success(res, activities);
    } catch (err) {
      return error(res, 'Failed to get activities');
    }
  });

  return router;
}

module.exports = createActivityRoutes;
