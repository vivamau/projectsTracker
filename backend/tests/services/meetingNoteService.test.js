const path = require('path');
const fs = require('fs');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { runQuery, getOne } = require('../../config/database');

// Point the service at a temp notes dir for tests
const tmpNotesDir = path.join(__dirname, '..', 'tmp_notes');
process.env.NOTES_DIR = tmpNotesDir;

const meetingNoteService = require('../../services/meetingNoteService');

let db;

beforeAll(async () => {
  fs.mkdirSync(tmpNotesDir, { recursive: true });
  db = await initTestDb();
  await seedTestDb(db);
});

afterAll(async () => {
  fs.rmSync(tmpNotesDir, { recursive: true, force: true });
  await closeTestDb(db);
});

describe('meetingNoteService', () => {
  describe('create', () => {
    it('should insert a DB row and return the new id', async () => {
      const result = await meetingNoteService.create(db, {
        note_title: 'Test Meeting',
        note_type: 'meeting',
        note_date: Date.now(),
        created_by_user_id: 1
      }, 'Initial content');
      expect(result.lastID).toBeDefined();
      expect(result.changes).toBe(1);
    });

    it('should write the .md file with the given content', async () => {
      const result = await meetingNoteService.create(db, {
        note_title: 'File Test',
        note_type: 'meeting',
        note_date: Date.now(),
        created_by_user_id: 1
      }, '# Hello\nThis is a test note.');
      const content = await meetingNoteService.getContent(db, result.lastID);
      expect(content).toBe('# Hello\nThis is a test note.');
    });

    it('should default note_type to meeting', async () => {
      const result = await meetingNoteService.create(db, {
        note_title: 'Default Type',
        note_date: null,
        created_by_user_id: 1
      }, '');
      const row = await getOne(db, 'SELECT note_type FROM meeting_notes WHERE id = ?', [result.lastID]);
      expect(row.note_type).toBe('meeting');
    });
  });

  describe('getContent', () => {
    it('should return content from the .md file', async () => {
      const result = await meetingNoteService.create(db, {
        note_title: 'Content Test',
        note_type: 'meeting',
        note_date: Date.now(),
        created_by_user_id: 1
      }, 'Some **markdown** content');
      const content = await meetingNoteService.getContent(db, result.lastID);
      expect(content).toBe('Some **markdown** content');
    });

    it('should return empty string if file does not exist', async () => {
      const content = await meetingNoteService.getContent(db, 99999);
      expect(content).toBe('');
    });
  });

  describe('update', () => {
    let noteId;
    beforeAll(async () => {
      const result = await meetingNoteService.create(db, {
        note_title: 'Update Test',
        note_type: 'meeting',
        note_date: Date.now(),
        created_by_user_id: 1
      }, 'Original content');
      noteId = result.lastID;
    });

    it('should update the note title in the DB', async () => {
      await meetingNoteService.update(db, noteId, { note_title: 'Updated Title' }, null);
      const row = await getOne(db, 'SELECT note_title FROM meeting_notes WHERE id = ?', [noteId]);
      expect(row.note_title).toBe('Updated Title');
    });

    it('should overwrite the .md file when content is provided', async () => {
      await meetingNoteService.update(db, noteId, {}, 'New **content**');
      const content = await meetingNoteService.getContent(db, noteId);
      expect(content).toBe('New **content**');
    });

    it('should set note_updatedate on update', async () => {
      await meetingNoteService.update(db, noteId, { note_title: 'Date Check' }, null);
      const row = await getOne(db, 'SELECT note_updatedate FROM meeting_notes WHERE id = ?', [noteId]);
      expect(row.note_updatedate).toBeGreaterThan(0);
    });

    it('should return changes=0 for non-existent note', async () => {
      const result = await meetingNoteService.update(db, 99999, { note_title: 'Ghost' }, null);
      expect(result.changes).toBe(0);
    });
  });

  describe('softDelete', () => {
    it('should set note_is_deleted=1', async () => {
      const result = await meetingNoteService.create(db, {
        note_title: 'To Delete',
        note_type: 'meeting',
        note_date: Date.now(),
        created_by_user_id: 1
      }, '');
      await meetingNoteService.softDelete(db, result.lastID);
      const row = await getOne(db, 'SELECT note_is_deleted FROM meeting_notes WHERE id = ?', [result.lastID]);
      expect(row.note_is_deleted).toBe(1);
    });

    it('should return changes=0 for already-deleted note', async () => {
      const result = await meetingNoteService.create(db, {
        note_title: 'Double Delete',
        note_type: 'meeting',
        note_date: Date.now(),
        created_by_user_id: 1
      }, '');
      await meetingNoteService.softDelete(db, result.lastID);
      const result2 = await meetingNoteService.softDelete(db, result.lastID);
      expect(result2.changes).toBe(0);
    });
  });

  describe('getAll', () => {
    let meetingId, adminId;

    beforeAll(async () => {
      const m = await meetingNoteService.create(db, {
        note_title: 'GetAll Meeting Note',
        note_type: 'meeting',
        note_date: Date.now(),
        created_by_user_id: 1
      }, '');
      meetingId = m.lastID;

      const a = await meetingNoteService.create(db, {
        note_title: 'GetAll Admin Note',
        note_type: 'admin',
        note_date: Date.now(),
        created_by_user_id: 1
      }, '');
      adminId = a.lastID;
    });

    it('should return all non-deleted notes', async () => {
      const notes = await meetingNoteService.getAll(db, {});
      expect(Array.isArray(notes)).toBe(true);
      expect(notes.find(n => n.id === meetingId)).toBeDefined();
      expect(notes.find(n => n.id === adminId)).toBeDefined();
    });

    it('should filter by type=meeting', async () => {
      const notes = await meetingNoteService.getAll(db, { type: 'meeting' });
      expect(notes.every(n => n.note_type === 'meeting')).toBe(true);
      expect(notes.find(n => n.id === adminId)).toBeUndefined();
    });

    it('should filter by type=admin', async () => {
      const notes = await meetingNoteService.getAll(db, { type: 'admin' });
      expect(notes.every(n => n.note_type === 'admin')).toBe(true);
    });

    it('should filter by search term (title match)', async () => {
      const notes = await meetingNoteService.getAll(db, { search: 'GetAll Admin' });
      expect(notes.find(n => n.id === adminId)).toBeDefined();
      expect(notes.find(n => n.id === meetingId)).toBeUndefined();
    });

    it('should not return soft-deleted notes', async () => {
      const result = await meetingNoteService.create(db, {
        note_title: 'Deleted Note',
        note_type: 'meeting',
        note_date: Date.now(),
        created_by_user_id: 1
      }, '');
      await meetingNoteService.softDelete(db, result.lastID);
      const notes = await meetingNoteService.getAll(db, {});
      expect(notes.find(n => n.id === result.lastID)).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('should return note metadata with entities', async () => {
      const result = await meetingNoteService.create(db, {
        note_title: 'GetById Test',
        note_type: 'meeting',
        note_date: Date.now(),
        created_by_user_id: 1
      }, '');
      await meetingNoteService.syncEntities(db, result.lastID, [
        { entity_type: 'project', entity_id: '1' }
      ]);
      const note = await meetingNoteService.getById(db, result.lastID);
      expect(note.note_title).toBe('GetById Test');
      expect(Array.isArray(note.entities)).toBe(true);
      expect(note.entities.length).toBe(1);
      expect(note.entities[0].entity_type).toBe('project');
    });

    it('should return null for non-existent note', async () => {
      const note = await meetingNoteService.getById(db, 99999);
      expect(note).toBeNull();
    });

    it('should return null for soft-deleted note', async () => {
      const result = await meetingNoteService.create(db, {
        note_title: 'Deleted GetById',
        note_type: 'meeting',
        note_date: Date.now(),
        created_by_user_id: 1
      }, '');
      await meetingNoteService.softDelete(db, result.lastID);
      const note = await meetingNoteService.getById(db, result.lastID);
      expect(note).toBeNull();
    });
  });

  describe('syncEntities', () => {
    let noteId;
    beforeAll(async () => {
      const result = await meetingNoteService.create(db, {
        note_title: 'Entities Test',
        note_type: 'meeting',
        note_date: Date.now(),
        created_by_user_id: 1
      }, '');
      noteId = result.lastID;
    });

    it('should insert entities', async () => {
      await meetingNoteService.syncEntities(db, noteId, [
        { entity_type: 'project', entity_id: '1' },
        { entity_type: 'user', entity_id: '2' }
      ]);
      const note = await meetingNoteService.getById(db, noteId);
      expect(note.entities.length).toBe(2);
    });

    it('should replace existing entities on re-sync', async () => {
      await meetingNoteService.syncEntities(db, noteId, [
        { entity_type: 'division', entity_id: '3' }
      ]);
      const note = await meetingNoteService.getById(db, noteId);
      expect(note.entities.length).toBe(1);
      expect(note.entities[0].entity_type).toBe('division');
    });

    it('should clear all entities with empty array', async () => {
      await meetingNoteService.syncEntities(db, noteId, []);
      const note = await meetingNoteService.getById(db, noteId);
      expect(note.entities.length).toBe(0);
    });
  });
});
