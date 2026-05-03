const express = require('express');
const { authenticate } = require('../middleware/auth');
const taskService = require('../services/taskService');
const { success, error } = require('../utilities/responseHelper');

function createTaskRoutes(db) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const project_id = parseInt(req.query.project_id);
      if (!project_id) return error(res, 'project_id is required', 400);
      const tasks = await taskService.getByProjectId(db, project_id);
      return success(res, tasks);
    } catch (err) {
      return error(res, 'Failed to list tasks');
    }
  });

  router.post('/', authenticate, async (req, res) => {
    try {
      const { project_id, task_title } = req.body;
      if (!project_id) return error(res, 'project_id is required', 400);
      if (!task_title) return error(res, 'task_title is required', 400);

      const result = await taskService.create(db, {
        ...req.body,
        created_by_user_id: req.user.id,
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create task');
    }
  });

  router.get('/:id', authenticate, async (req, res) => {
    try {
      const task = await taskService.getById(db, parseInt(req.params.id));
      if (!task) return error(res, 'Task not found', 404);
      return success(res, task);
    } catch (err) {
      return error(res, 'Failed to get task');
    }
  });

  router.put('/:id', authenticate, async (req, res) => {
    try {
      await taskService.update(db, parseInt(req.params.id), req.body);
      return success(res, { updated: true });
    } catch (err) {
      return error(res, 'Failed to update task');
    }
  });

  router.patch('/:id/close', authenticate, async (req, res) => {
    try {
      await taskService.close(db, parseInt(req.params.id));
      return success(res, { closed: true });
    } catch (err) {
      return error(res, 'Failed to close task');
    }
  });

  router.delete('/:id', authenticate, async (req, res) => {
    try {
      await taskService.softDelete(db, parseInt(req.params.id));
      return success(res, { deleted: true });
    } catch (err) {
      return error(res, 'Failed to delete task');
    }
  });

  router.post('/:id/followups', authenticate, async (req, res) => {
    try {
      const { followup_note } = req.body;
      if (!followup_note) return error(res, 'followup_note is required', 400);
      const result = await taskService.createFollowup(db, {
        task_id: parseInt(req.params.id),
        followup_note,
        user_id: req.user.id,
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create followup');
    }
  });

  router.put('/:id/followups/:followupId', authenticate, async (req, res) => {
    try {
      const { followup_note } = req.body;
      if (!followup_note) return error(res, 'followup_note is required', 400);
      await taskService.updateFollowup(db, parseInt(req.params.followupId), { followup_note });
      return success(res, { updated: true });
    } catch (err) {
      return error(res, 'Failed to update followup');
    }
  });

  router.delete('/:id/followups/:followupId', authenticate, async (req, res) => {
    try {
      await taskService.deleteFollowup(db, parseInt(req.params.followupId));
      return success(res, { deleted: true });
    } catch (err) {
      return error(res, 'Failed to delete followup');
    }
  });

  return router;
}

module.exports = createTaskRoutes;
