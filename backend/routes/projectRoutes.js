const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const projectService = require('../services/projectService');
const healthStatusService = require('../services/healthStatusService');
const completionService = require('../services/completionService');
const budgetService = require('../services/budgetService');
const projectManagerService = require('../services/projectManagerService');
const solutionArchitectService = require('../services/solutionArchitectService');
const vendorResourceService = require('../services/vendorResourceService');
const activityService = require('../services/activityService');
const { success, error, paginated } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');

function createProjectRoutes(db, auditDb) {
  const router = express.Router();

  router.get('/stats', authenticate, async (req, res) => {
    try {
      const stats = await projectService.getStats(db);
      return success(res, stats);
    } catch (err) {
      return error(res, 'Failed to get stats');
    }
  });

  router.get('/', authenticate, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const division_id = req.query.division_id ? parseInt(req.query.division_id) : null;
      const status_id = req.query.status_id ? parseInt(req.query.status_id) : null;

      const result = await projectService.getAll(db, { page, limit, search, division_id, status_id });
      return paginated(res, result.data, result.total, page, limit);
    } catch (err) {
      return error(res, 'Failed to list projects');
    }
  });

  router.get('/:id', authenticate, async (req, res) => {
    try {
      const project = await projectService.getById(db, parseInt(req.params.id));
      if (!project) {
        return error(res, 'Project not found', 404);
      }
      return success(res, project);
    } catch (err) {
      return error(res, 'Failed to get project');
    }
  });

  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { project_name } = req.body;
      if (!project_name) {
        return error(res, 'project_name is required', 400);
      }

      const result = await projectService.create(db, { ...req.body, user_id: req.body.user_id || req.user.id });
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project.create',
        entityType: 'project',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create project');
    }
  });

  router.put('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await projectService.getById(db, id);
      if (!existing) {
        return error(res, 'Project not found', 404);
      }

      await projectService.update(db, id, req.body);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project.update',
        entityType: 'project',
        entityId: id,
        details: { before: existing, after: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Project updated' });
    } catch (err) {
      return error(res, 'Failed to update project');
    }
  });

  router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await projectService.softDelete(db, id);
      if (result.changes === 0) {
        return error(res, 'Project not found', 404);
      }
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project.delete',
        entityType: 'project',
        entityId: id,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Project deleted' });
    } catch (err) {
      return error(res, 'Failed to delete project');
    }
  });

  router.get('/:id/health-statuses', authenticate, async (req, res) => {
    try {
      const statuses = await healthStatusService.getByProjectId(db, parseInt(req.params.id));
      return success(res, statuses);
    } catch (err) {
      return error(res, 'Failed to get health statuses');
    }
  });

  router.post('/:id/health-statuses', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { healthstatus_value, healthstatus_comment } = req.body;
      if (!healthstatus_value) {
        return error(res, 'healthstatus_value is required', 400);
      }

      const result = await healthStatusService.create(db, {
        project_id: parseInt(req.params.id),
        healthstatus_value,
        healthstatus_comment
      });
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project.health_status.create',
        entityType: 'health_status',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create health status');
    }
  });

  router.get('/:id/completions', authenticate, async (req, res) => {
    try {
      const completions = await completionService.getByProjectId(db, parseInt(req.params.id));
      return success(res, completions);
    } catch (err) {
      return error(res, 'Failed to get completions');
    }
  });

  router.post('/:id/completions', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { completion_value, completion_comment, completion_start_date, completion_end_date } = req.body;
      if (completion_value === undefined || completion_value === null) {
        return error(res, 'completion_value is required', 400);
      }
      if (completion_value < 0 || completion_value > 100) {
        return error(res, 'completion_value must be between 0 and 100', 400);
      }

      const result = await completionService.create(db, {
        project_id: parseInt(req.params.id),
        completion_value,
        completion_comment,
        completion_start_date,
        completion_end_date,
        user_id: req.user.id
      });
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project.completion.create',
        entityType: 'completion',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create completion');
    }
  });

  router.put('/:id/completions/:completionId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await completionService.update(db, parseInt(req.params.completionId), req.body);
      if (result.changes === 0) {
        return error(res, 'Completion not found', 404);
      }
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project.completion.update',
        entityType: 'completion',
        entityId: parseInt(req.params.completionId),
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Completion updated' });
    } catch (err) {
      return error(res, 'Failed to update completion');
    }
  });

  router.delete('/:id/completions/:completionId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await completionService.softDelete(db, parseInt(req.params.completionId));
      if (result.changes === 0) {
        return error(res, 'Completion not found', 404);
      }
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project.completion.delete',
        entityType: 'completion',
        entityId: parseInt(req.params.completionId),
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Completion deleted' });
    } catch (err) {
      return error(res, 'Failed to delete completion');
    }
  });

  router.get('/:id/budgets/total', authenticate, async (req, res) => {
    try {
      const total = await budgetService.getTotalByProjectId(db, parseInt(req.params.id));
      return success(res, { total });
    } catch (err) {
      return error(res, 'Failed to get budget total');
    }
  });

  router.get('/:id/budgets', authenticate, async (req, res) => {
    try {
      const budgets = await budgetService.getByProjectId(db, parseInt(req.params.id));
      return success(res, budgets);
    } catch (err) {
      return error(res, 'Failed to get budgets');
    }
  });

  router.post('/:id/budgets', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { budget_amount } = req.body;
      if (budget_amount === undefined || budget_amount === null) {
        return error(res, 'budget_amount is required', 400);
      }
      if (budget_amount < 0) {
        return error(res, 'budget_amount must be non-negative', 400);
      }

      const result = await budgetService.create(db, req.body);
      await budgetService.linkToProject(db, parseInt(req.params.id), result.lastID);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project.budget.create',
        entityType: 'budget',
        entityId: result.lastID,
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create budget');
    }
  });

  router.put('/:id/budgets/:budgetId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const result = await budgetService.update(db, parseInt(req.params.budgetId), req.body);
      if (result.changes === 0) {
        return error(res, 'Budget not found', 404);
      }
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project.budget.update',
        entityType: 'budget',
        entityId: parseInt(req.params.budgetId),
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Budget updated' });
    } catch (err) {
      return error(res, 'Failed to update budget');
    }
  });

  router.delete('/:id/budgets/:budgetId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const budgetId = parseInt(req.params.budgetId);
      const result = await budgetService.softDelete(db, budgetId);
      if (result.changes === 0) {
        return error(res, 'Budget not found', 404);
      }
      await budgetService.unlinkFromProject(db, parseInt(req.params.id), budgetId);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project.budget.delete',
        entityType: 'budget',
        entityId: budgetId,
        details: {},
        ip: req.ip
      });
      return success(res, { message: 'Budget deleted' });
    } catch (err) {
      return error(res, 'Failed to delete budget');
    }
  });

  router.get('/:id/project-managers', authenticate, async (req, res) => {
    try {
      const pms = await projectManagerService.getByProjectId(db, parseInt(req.params.id));
      return success(res, pms);
    } catch (err) {
      return error(res, 'Failed to get project managers');
    }
  });

  router.put('/:id/project-managers', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { project_managers } = req.body;
      if (!Array.isArray(project_managers)) {
        return error(res, 'project_managers array is required', 400);
      }
      await projectManagerService.syncProjectManagers(db, parseInt(req.params.id), project_managers);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project.project_managers.update',
        entityType: 'project_manager',
        entityId: parseInt(req.params.id),
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Project managers updated' });
    } catch (err) {
      return error(res, 'Failed to update project managers');
    }
  });

  router.get('/:id/solution-architects', authenticate, async (req, res) => {
    try {
      const sas = await solutionArchitectService.getByProjectId(db, parseInt(req.params.id));
      return success(res, sas);
    } catch (err) {
      return error(res, 'Failed to get solution architects');
    }
  });

  router.put('/:id/solution-architects', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { solution_architects } = req.body;
      if (!Array.isArray(solution_architects)) {
        return error(res, 'solution_architects array is required', 400);
      }
      await solutionArchitectService.syncSolutionArchitects(db, parseInt(req.params.id), solution_architects);
      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'project.solution_architects.update',
        entityType: 'solution_architect',
        entityId: parseInt(req.params.id),
        details: { data: req.body },
        ip: req.ip
      });
      return success(res, { message: 'Solution architects updated' });
    } catch (err) {
      return error(res, 'Failed to update solution architects');
    }
  });

  router.get('/:id/vendor-resources', authenticate, async (req, res) => {
    try {
      const resources = await vendorResourceService.getByProjectId(db, parseInt(req.params.id));
      return success(res, resources);
    } catch (err) {
      return error(res, 'Failed to get vendor resources');
    }
  });

  router.get('/:id/activities', authenticate, async (req, res) => {
    try {
      const activities = await activityService.getByProjectId(db, parseInt(req.params.id));
      return success(res, activities);
    } catch (err) {
      return error(res, 'Failed to get activities');
    }
  });

  return router;
}

module.exports = createProjectRoutes;
