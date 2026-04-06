const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const divisionService = require('../services/divisionService');
const focalPointService = require('../services/focalPointService');
const { success, error } = require('../utilities/responseHelper');
const { getAll, getOne } = require('../config/database');
const { auditLog } = require('../utilities/auditHelper');

function createDivisionRoutes(db, auditDb) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const divisions = await divisionService.getAll(db);
      return success(res, divisions);
    } catch (err) {
      return error(res, 'Failed to list divisions');
    }
  });

  router.get('/:id', authenticate, async (req, res) => {
    try {
      const division = await divisionService.getById(db, parseInt(req.params.id));
      if (!division) return error(res, 'Division not found', 404);

      const focalPointsCount = await getOne(db,
        'SELECT COUNT(*) as count FROM focalpoints WHERE division_id = ?',
        [division.id]
      );
      const projectsCount = await getOne(db,
        'SELECT COUNT(*) as count FROM projects WHERE division_id = ? AND (project_is_deleted = 0 OR project_is_deleted IS NULL)',
        [division.id]
      );
      const totalBudget = await getOne(db,
        `SELECT COALESCE(SUM(b.budget_amount), 0) as total
         FROM budgets b
         INNER JOIN projects_to_budgets ptb ON b.id = ptb.budget_id
         INNER JOIN projects p ON ptb.project_id = p.id
         WHERE p.division_id = ? AND (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)
           AND (b.budget_is_deleted = 0 OR b.budget_is_deleted IS NULL)`,
        [division.id]
      );

      return success(res, {
        ...division,
        focal_points_count: focalPointsCount.count,
        projects_count: projectsCount.count,
        total_budget: totalBudget.total
      });
    } catch (err) {
      return error(res, 'Failed to get division');
    }
  });

  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { division_name } = req.body;
      if (!division_name) return error(res, 'division_name is required', 400);
      const result = await divisionService.create(db, { division_name });
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'division.create',
        entityType: 'division',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create division');
    }
  });

  router.put('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await divisionService.getById(db, id);
      if (!existing) return error(res, 'Division not found', 404);
      await divisionService.update(db, id, req.body);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'division.update',
        entityType: 'division',
        entityId: id,
        details: { before: existing, after: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Division updated' });
    } catch (err) {
      return error(res, 'Failed to update division');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await divisionService.softDelete(db, id);
      if (result.changes === 0) return error(res, 'Division not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'division.delete',
        entityType: 'division',
        entityId: id,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Division deleted' });
    } catch (err) {
      return error(res, 'Failed to delete division');
    }
  });

  router.get('/:id/focal-points', authenticate, async (req, res) => {
    try {
      const fps = await focalPointService.getByDivisionId(db, parseInt(req.params.id));
      return success(res, fps);
    } catch (err) {
      return error(res, 'Failed to get focal points');
    }
  });

  router.post('/:id/focal-points', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { user_id } = req.body;
      if (!user_id) return error(res, 'user_id is required', 400);
      const result = await focalPointService.create(db, {
        division_id: parseInt(req.params.id),
        user_id
      });
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'division.focal_point.create',
        entityType: 'focal_point',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to add focal point');
    }
  });

  router.put('/:id/focal-points', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { user_ids } = req.body;
      if (!Array.isArray(user_ids)) return error(res, 'user_ids array is required', 400);
      await focalPointService.syncFocalPoints(db, parseInt(req.params.id), user_ids);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'division.focal_points.sync',
        entityType: 'focal_point',
        entityId: parseInt(req.params.id),
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Focal points updated' });
    } catch (err) {
      return error(res, 'Failed to update focal points');
    }
  });

  router.delete('/:id/focal-points/:fpId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const fpId = parseInt(req.params.fpId);
      const result = await focalPointService.remove(db, fpId);
      if (result.changes === 0) return error(res, 'Focal point not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'division.focal_point.delete',
        entityType: 'focal_point',
        entityId: fpId,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Focal point removed' });
    } catch (err) {
      return error(res, 'Failed to remove focal point');
    }
  });

  router.get('/:id/project-managers', authenticate, async (req, res) => {
    try {
      const pms = await getAll(db,
        `SELECT DISTINCT pm.id, pm.user_id, u.user_name, u.user_lastname, u.user_email,
                p.id as project_id, p.project_name
         FROM projectmanagers pm
         INNER JOIN projects_to_projectmanagers ppm ON pm.id = ppm.projectmanager_id
         INNER JOIN projects p ON ppm.project_id = p.id
         LEFT JOIN users u ON pm.user_id = u.id
         WHERE ppm.division_id = ? AND (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)
         ORDER BY u.user_name, p.project_name`,
        [parseInt(req.params.id)]
      );
      return success(res, pms);
    } catch (err) {
      return error(res, 'Failed to get division project managers');
    }
  });

  router.get('/:id/solution-architects', authenticate, async (req, res) => {
    try {
      const sas = await getAll(db,
        `SELECT DISTINCT sa.id, sa.user_id, u.user_name, u.user_lastname, u.user_email,
                p.id as project_id, p.project_name
         FROM solutionarchitects sa
         INNER JOIN projects_to_solutionarchitects psa ON sa.id = psa.solutionarchitect_id
         INNER JOIN projects p ON psa.project_id = p.id
         LEFT JOIN users u ON sa.user_id = u.id
         WHERE psa.division_id = ? AND (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)
         ORDER BY u.user_name, p.project_name`,
        [parseInt(req.params.id)]
      );
      return success(res, sas);
    } catch (err) {
      return error(res, 'Failed to get division solution architects');
    }
  });

  router.get('/:id/projects', authenticate, async (req, res) => {
    try {
      const projects = await getAll(db,
        `SELECT p.id, p.project_name, p.project_description, p.project_create_date,
                p.project_start_date, p.project_end_date,
                u.user_name as owner_name, u.user_lastname as owner_lastname,
                (SELECT hs.healthstatus_value FROM healthstatuses hs
                 WHERE hs.project_id = p.id
                 ORDER BY hs.healthstatus_create_date DESC, hs.id DESC LIMIT 1) as health_status
         FROM projects p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.division_id = ? AND (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)
         ORDER BY p.project_create_date DESC`,
        [parseInt(req.params.id)]
      );
      return success(res, projects);
    } catch (err) {
      return error(res, 'Failed to get division projects');
    }
  });

  router.get('/:id/supporting-projects', authenticate, async (req, res) => {
    try {
      const projects = await getAll(db,
        `SELECT p.id, p.project_name, p.project_description, p.project_create_date,
                p.project_start_date, p.project_end_date,
                u.user_name as owner_name, u.user_lastname as owner_lastname,
                (SELECT hs.healthstatus_value FROM healthstatuses hs
                 WHERE hs.project_id = p.id
                 ORDER BY hs.healthstatus_create_date DESC, hs.id DESC LIMIT 1) as health_status
         FROM projects p
         LEFT JOIN users u ON p.user_id = u.id
         JOIN projects_to_divisions ptd ON p.id = ptd.project_id
         WHERE ptd.division_id = ? AND (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)
         ORDER BY p.project_create_date DESC`,
        [parseInt(req.params.id)]
      );
      return success(res, projects);
    } catch (err) {
      return error(res, 'Failed to get supporting projects');
    }
  });

  return router;
}

module.exports = createDivisionRoutes;
