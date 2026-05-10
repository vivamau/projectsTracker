const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const userService = require('../services/userService');
const { success, error, paginated } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');

function createUserRoutes(db, auditDb) {
  const router = express.Router();

  router.get('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const expired = await userService.deactivateExpiredUsers(db);
      for (const u of expired) {
        await auditLog(auditDb, {
          userId: null,
          userEmail: 'system',
          action: 'user.expired',
          entityType: 'user',
          entityId: u.id,
          details: { user_email: u.user_email },
          ip: req.ip
        });
      }
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

  router.get('/:id/projects', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const projects = await userService.getProjectsByUserId(db, parseInt(req.params.id));
      return success(res, projects);
    } catch (err) {
      return error(res, 'Failed to get user projects');
    }
  });

  router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { user_email, password, userrole_id, user_active = 1 } = req.body;
      const isActive = user_active === 1 || user_active === true;
      if (!user_email) return error(res, 'user_email is required', 400);
      if (isActive && (!password || !userrole_id)) {
        return error(res, 'password and userrole_id are required for active users', 400);
      }
      const result = await userService.create(db, req.body);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'user.create',
        entityType: 'user',
        entityId: result.lastID,
        details: { data: { user_email, userrole_id } },
        ip: req.ip
      });
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
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'user.update',
        entityType: 'user',
        entityId: id,
        details: { before: existing, after: req.body },
        ip: req.ip
      });
      if (req.body.user_expire_date !== undefined && req.body.user_expire_date !== existing.user_expire_date) {
        await auditLog(auditDb, {
          userId: req.user.id,
          userEmail: req.user.email,
          action: req.body.user_expire_date ? 'user.set_expiry' : 'user.clear_expiry',
          entityType: 'user',
          entityId: id,
          details: { user_email: existing.user_email, user_expire_date: req.body.user_expire_date },
          ip: req.ip
        });
      }
      return success(res, { message: 'User updated' });
    } catch (err) {
      return error(res, 'Failed to update user');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await userService.softDelete(db, id);
      if (result.changes === 0) return error(res, 'User not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'user.delete',
        entityType: 'user',
        entityId: id,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'User deleted' });
    } catch (err) {
      return error(res, 'Failed to delete user');
    }
  });

  return router;
}

module.exports = createUserRoutes;
