const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const projectRoleService = require('../services/projectRoleService');
const { success, error } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');

function createProjectRoleRoutes(db, auditDb) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const roles = await projectRoleService.getAll(db);
      return success(res, roles);
    } catch (err) {
      return error(res, 'Failed to get project roles');
    }
  });

  router.get('/:id', authenticate, async (req, res) => {
    try {
      const role = await projectRoleService.getById(db, parseInt(req.params.id));
      if (!role) {
        return error(res, 'Project role not found', 404);
      }
      return success(res, role);
    } catch (err) {
      return error(res, 'Failed to get project role');
    }
  });

  router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const { role_name } = req.body;
      if (!role_name) {
        return error(res, 'role_name is required', 400);
      }

      const result = await projectRoleService.create(db, req.body);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project_role.create',
        entityType: 'project_role',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create project role');
    }
  });

  router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await projectRoleService.getById(db, id);
      if (!existing) {
        return error(res, 'Project role not found', 404);
      }

      const result = await projectRoleService.update(db, id, req.body);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project_role.update',
        entityType: 'project_role',
        entityId: id,
        details: { before: existing, after: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Project role updated' });
    } catch (err) {
      return error(res, 'Failed to update project role');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await projectRoleService.softDelete(db, id);
      if (result.changes === 0) {
        return error(res, 'Project role not found', 404);
      }
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project_role.delete',
        entityType: 'project_role',
        entityId: id,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Project role deleted' });
    } catch (err) {
      return error(res, 'Failed to delete project role');
    }
  });

  return router;
}

module.exports = createProjectRoleRoutes;
