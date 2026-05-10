const express = require('express');
const { authenticate } = require('../middleware/auth');
const meetingNoteService = require('../services/meetingNoteService');
const noteAiService = require('../services/noteAiService');
const { getAll: getAllProjects } = require('../services/projectService');
const { success, error } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');
const { runQuery, getAll } = require('../config/database');

function createNoteRoutes(db, auditDb) {
  const router = express.Router();

  // GET /api/notes — list notes
  router.get('/', authenticate, async (req, res) => {
    try {
      const { type, search, date, entity_type, entity_id } = req.query;
      const notes = await meetingNoteService.getAll(db, { type, search, date, entity_type, entity_id });
      return success(res, notes);
    } catch (err) {
      return error(res, 'Failed to get notes');
    }
  });

  // GET /api/notes/mentions — entity autocomplete search
  router.get('/mentions', authenticate, async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      if (!q) return success(res, []);
      const like = `%${q}%`;
      const results = [];

      const projects = await getAll(db,
        `SELECT id, project_name as label FROM projects
         WHERE (project_is_deleted = 0 OR project_is_deleted IS NULL) AND project_name LIKE ?
         LIMIT 5`, [like]);
      projects.forEach(r => results.push({ type: 'project', id: r.id, label: r.label, url: `/projects/${r.id}` }));

      const divisions = await getAll(db,
        `SELECT id, division_name as label FROM divisions
         WHERE (division_is_deleted = 0 OR division_is_deleted IS NULL) AND division_name LIKE ?
         LIMIT 5`, [like]);
      divisions.forEach(r => results.push({ type: 'division', id: r.id, label: r.label, url: `/divisions/${r.id}` }));

      const initiatives = await getAll(db,
        `SELECT id, initiative_name as label FROM initiatives
         WHERE (initiative_is_deleted = 0 OR initiative_is_deleted IS NULL) AND initiative_name LIKE ?
         LIMIT 5`, [like]);
      initiatives.forEach(r => results.push({ type: 'initiative', id: r.id, label: r.label, url: `/initiatives/${r.id}` }));

      const vendors = await getAll(db,
        `SELECT id, vendor_name as label FROM vendors
         WHERE (vendor_is_deleted = 0 OR vendor_is_deleted IS NULL) AND vendor_name LIKE ?
         LIMIT 5`, [like]);
      vendors.forEach(r => results.push({ type: 'vendor', id: r.id, label: r.label, url: `/vendors/${r.id}` }));

      const users = await getAll(db,
        `SELECT id, (user_name || ' ' || COALESCE(user_lastname, '')) as label FROM users
         WHERE (user_is_deleted = 0 OR user_is_deleted IS NULL) AND (user_name LIKE ? OR user_lastname LIKE ?)
         LIMIT 5`, [like, like]);
      users.forEach(r => results.push({ type: 'user', id: r.id, label: r.label.trim(), url: `/users/${r.id}` }));

      const countries = await getAll(db,
        `SELECT UN_country_code as id, short_name as label FROM countries WHERE short_name LIKE ? LIMIT 5`,
        [like]);
      countries.forEach(r => results.push({ type: 'country', id: r.id, label: r.label, url: `/countries/${r.id}` }));

      return success(res, results);
    } catch (err) {
      return error(res, 'Failed to search mentions');
    }
  });

  // POST /api/notes — create note
  router.post('/', authenticate, async (req, res) => {
    try {
      const { note_title, note_type, note_date, entities, content } = req.body;
      if (!note_title) return error(res, 'note_title is required', 400);
      const result = await meetingNoteService.create(db, {
        note_title,
        note_type: note_type || 'meeting',
        note_date: note_date || null,
        created_by_user_id: req.user.id
      }, content || '');
      if (entities && entities.length > 0) {
        await meetingNoteService.syncEntities(db, result.lastID, entities);
      }
      await auditLog(auditDb, {
        userId: req.user.id, userEmail: req.user.email,
        action: 'note.create', entityType: 'meeting_note', entityId: result.lastID,
        details: { note_title, note_type }, ip: req.ip
      });
      return success(res, { id: result.lastID }, 201);
    } catch (err) {
      return error(res, 'Failed to create note');
    }
  });

  // POST /api/notes/:id/ai-extract — AI entity extraction
  router.post('/:id/ai-extract', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const note = await meetingNoteService.getById(db, id);
      if (!note) return error(res, 'Note not found', 404);
      const content = req.body.content ?? await meetingNoteService.getContent(db, id);
      if (!content.trim()) return error(res, 'Note content is empty', 400);
      const result = await noteAiService.extractEntities(db, content);
      return success(res, result);
    } catch (err) {
      return error(res, err.message || 'AI extraction failed');
    }
  });

  // GET /api/notes/:id — get note metadata + entities
  router.get('/:id', authenticate, async (req, res) => {
    try {
      const note = await meetingNoteService.getById(db, parseInt(req.params.id));
      if (!note) return error(res, 'Note not found', 404);
      return success(res, note);
    } catch (err) {
      return error(res, 'Failed to get note');
    }
  });

  // GET /api/notes/:id/content — get .md file content
  router.get('/:id/content', authenticate, async (req, res) => {
    try {
      const content = await meetingNoteService.getContent(db, parseInt(req.params.id));
      res.type('text/plain').send(content);
    } catch (err) {
      return error(res, 'Failed to get note content');
    }
  });

  // PUT /api/notes/:id — update note
  router.put('/:id', authenticate, async (req, res) => {
    try {
      const { note_title, note_type, note_date, entities, content } = req.body;
      const id = parseInt(req.params.id);
      const result = await meetingNoteService.update(db, id, { note_title, note_type, note_date }, content ?? null);
      if (result.changes === 0) return error(res, 'Note not found', 404);
      if (entities !== undefined) {
        await meetingNoteService.syncEntities(db, id, entities);
      }
      await auditLog(auditDb, {
        userId: req.user.id, userEmail: req.user.email,
        action: 'note.update', entityType: 'meeting_note', entityId: id,
        details: { note_title }, ip: req.ip
      });
      return success(res, { message: 'Note updated' });
    } catch (err) {
      return error(res, 'Failed to update note');
    }
  });

  // DELETE /api/notes/:id — soft delete
  router.delete('/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await meetingNoteService.softDelete(db, id);
      if (result.changes === 0) return error(res, 'Note not found', 404);
      await auditLog(auditDb, {
        userId: req.user.id, userEmail: req.user.email,
        action: 'note.delete', entityType: 'meeting_note', entityId: id,
        details: {}, ip: req.ip
      });
      return success(res, { message: 'Note deleted' });
    } catch (err) {
      return error(res, 'Failed to delete note');
    }
  });

  return router;
}

module.exports = createNoteRoutes;
