const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const userService = require('../services/userService');
const { success, error, paginated } = require('../utilities/responseHelper');

function createUserRoutes(db) {
  const router = express.Router();

  router.get('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const result = await userService.getAll(db, { page, limit, search });
      return paginated(res, result.data, result.total, page, limit);
    } catch (err) {
      return error(res, 'Failed to list users');
    }
  });

  router.get('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const user = await userService.getById(db, parseInt(req.params.id));
      if (!user) return error(res, 'User not found', 404);
      return success(res, user);
    } catch (err) {
      return error(res, 'Failed to get user');
    }
  });

  router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { user_email, password, userrole_id } = req.body;
      if (!user_email || !password || !userrole_id) {
        return error(res, 'user_email, password, and userrole_id are required', 400);
      }
      const result = await userService.create(db, req.body);
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE')) {
        return error(res, 'Email already exists', 409);
      }
      return error(res, 'Failed to create user');
    }
  });

  router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await userService.getById(db, id);
      if (!existing) return error(res, 'User not found', 404);
      await userService.update(db, id, req.body);
      return success(res, { message: 'User updated' });
    } catch (err) {
      return error(res, 'Failed to update user');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const result = await userService.softDelete(db, parseInt(req.params.id));
      if (result.changes === 0) return error(res, 'User not found', 404);
      return success(res, { message: 'User deleted' });
    } catch (err) {
      return error(res, 'Failed to delete user');
    }
  });

  return router;
}

module.exports = createUserRoutes;
