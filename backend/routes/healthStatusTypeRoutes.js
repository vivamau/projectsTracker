const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getAll, getOne, runQuery } = require('../config/database');
const { success, error } = require('../utilities/responseHelper');

function createHealthStatusTypeRoutes(db) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const types = await getAll(db,
        `SELECT id, healthstatus_name, healthstatus_description
         FROM healthstatus_types
         WHERE healthstatus_is_deleted = 0
         ORDER BY healthstatus_name`
      );
      return success(res, types);
    } catch (err) {
      return error(res, 'Failed to get health status types');
    }
  });

  router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { healthstatus_name, healthstatus_description } = req.body;
      if (!healthstatus_name) {
        return error(res, 'healthstatus_name is required', 400);
      }
      const result = await runQuery(db,
        `INSERT INTO healthstatus_types (healthstatus_name, healthstatus_description, healthstatus_create_date, healthstatus_is_deleted)
         VALUES (?, ?, ?, 0)`,
        [healthstatus_name.trim(), healthstatus_description || null, Date.now()]
      );
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create health status type');
    }
  });

  router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getOne(db,
        'SELECT id FROM healthstatus_types WHERE id = ? AND healthstatus_is_deleted = 0', [id]
      );
      if (!existing) return error(res, 'Health status type not found', 404);

      const { healthstatus_name, healthstatus_description } = req.body;
      await runQuery(db,
        `UPDATE healthstatus_types SET healthstatus_name = COALESCE(?, healthstatus_name),
         healthstatus_description = COALESCE(?, healthstatus_description)
         WHERE id = ?`,
        [healthstatus_name?.trim() || null, healthstatus_description ?? null, id]
      );
      return success(res, { message: 'Health status type updated' });
    } catch (err) {
      return error(res, 'Failed to update health status type');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await runQuery(db,
        'UPDATE healthstatus_types SET healthstatus_is_deleted = 1 WHERE id = ? AND healthstatus_is_deleted = 0',
        [id]
      );
      if (result.changes === 0) return error(res, 'Health status type not found', 404);
      return success(res, { message: 'Health status type deleted' });
    } catch (err) {
      return error(res, 'Failed to delete health status type');
    }
  });

  return router;
}

module.exports = createHealthStatusTypeRoutes;
