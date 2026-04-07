const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getAll, getOne, runQuery } = require('../config/database');
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

  router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { project_status_name, project_status_description } = req.body;
      if (!project_status_name) {
        return error(res, 'project_status_name is required', 400);
      }
      const result = await runQuery(db,
        `INSERT INTO project_statuses (project_status_name, project_status_description, project_status_create_date, project_status_is_deleted)
         VALUES (?, ?, ?, 0)`,
        [project_status_name.trim(), project_status_description || null, Date.now()]
      );
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create project status');
    }
  });

  router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getOne(db,
        'SELECT id FROM project_statuses WHERE id = ? AND project_status_is_deleted = 0', [id]
      );
      if (!existing) return error(res, 'Project status not found', 404);

      const { project_status_name, project_status_description } = req.body;
      await runQuery(db,
        `UPDATE project_statuses SET project_status_name = COALESCE(?, project_status_name),
         project_status_description = COALESCE(?, project_status_description)
         WHERE id = ?`,
        [project_status_name?.trim() || null, project_status_description ?? null, id]
      );
      return success(res, { message: 'Project status updated' });
    } catch (err) {
      return error(res, 'Failed to update project status');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await runQuery(db,
        'UPDATE project_statuses SET project_status_is_deleted = 1 WHERE id = ? AND project_status_is_deleted = 0',
        [id]
      );
      if (result.changes === 0) return error(res, 'Project status not found', 404);
      return success(res, { message: 'Project status deleted' });
    } catch (err) {
      return error(res, 'Failed to delete project status');
    }
  });

  return router;
}

module.exports = createProjectStatusRoutes;
