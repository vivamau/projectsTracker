const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const projectService = require('../services/projectService');
const healthStatusService = require('../services/healthStatusService');
const completionService = require('../services/completionService');
const budgetService = require('../services/budgetService');
const projectManagerService = require('../services/projectManagerService');
const { success, error, paginated } = require('../utilities/responseHelper');

function createProjectRoutes(db) {
  const router = express.Router();

  // Get project stats (must be before /:id to avoid matching 'stats')
  router.get('/stats', authenticate, async (req, res) => {
    try {
      const stats = await projectService.getStats(db);
      return success(res, stats);
    } catch (err) {
      return error(res, 'Failed to get stats');
    }
  });

  // List projects (paginated)
  router.get('/', authenticate, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const division_id = req.query.division_id ? parseInt(req.query.division_id) : null;

      const result = await projectService.getAll(db, { page, limit, search, division_id });
      return paginated(res, result.data, result.total, page, limit);
    } catch (err) {
      return error(res, 'Failed to list projects');
    }
  });

  // Get single project
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

  // Create project (admin+)
  router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const { project_name } = req.body;
      if (!project_name) {
        return error(res, 'project_name is required', 400);
      }

      const result = await projectService.create(db, { ...req.body, user_id: req.body.user_id || req.user.id });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create project');
    }
  });

  // Update project (admin+)
  router.put('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await projectService.getById(db, id);
      if (!existing) {
        return error(res, 'Project not found', 404);
      }

      await projectService.update(db, id, req.body);
      return success(res, { message: 'Project updated' });
    } catch (err) {
      return error(res, 'Failed to update project');
    }
  });

  // Delete project (admin+)
  router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await projectService.softDelete(db, id);
      if (result.changes === 0) {
        return error(res, 'Project not found', 404);
      }
      return success(res, { message: 'Project deleted' });
    } catch (err) {
      return error(res, 'Failed to delete project');
    }
  });

  // Health statuses for a project
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
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create health status');
    }
  });

  // Completions (milestones) for a project
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
      const { completion_value, completion_comment } = req.body;
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
        user_id: req.user.id
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
      return success(res, { message: 'Completion deleted' });
    } catch (err) {
      return error(res, 'Failed to delete completion');
    }
  });

  // Budgets for a project
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
      return success(res, { message: 'Budget deleted' });
    } catch (err) {
      return error(res, 'Failed to delete budget');
    }
  });

  // Project Managers
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
      return success(res, { message: 'Project managers updated' });
    } catch (err) {
      return error(res, 'Failed to update project managers');
    }
  });

  return router;
}

module.exports = createProjectRoutes;
