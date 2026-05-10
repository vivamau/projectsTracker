const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { runQuery, getOne } = require('../../config/database');
const projectLinkService = require('../../services/projectLinkService');

let db;
let projectId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  const proj = await runQuery(db,
    'INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)',
    ['Link Test Project', Date.now(), 1]
  );
  projectId = proj.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('projectLinkService', () => {
  describe('create', () => {
    it('should create a link and return lastID', async () => {
      const result = await projectLinkService.create(db, projectId, {
        projectlink_label: 'GitHub',
        projectlink_URL: 'https://github.com/org/repo'
      });
      expect(result.lastID).toBeDefined();
      expect(result.changes).toBe(1);
    });

    it('should store the correct fields', async () => {
      const result = await projectLinkService.create(db, projectId, {
        projectlink_label: 'Confluence',
        projectlink_URL: 'https://confluence.example.com'
      });
      const row = await getOne(db, 'SELECT * FROM project_links WHERE id = ?', [result.lastID]);
      expect(row.project_id).toBe(projectId);
      expect(row.projectlink_label).toBe('Confluence');
      expect(row.projectlink_URL).toBe('https://confluence.example.com');
      expect(row.projectlink_createdate).toBeGreaterThan(0);
      expect(row.projectlink_is_deleted).toBe(0);
    });
  });

  describe('getByProjectId', () => {
    let localProjectId;

    beforeAll(async () => {
      const proj = await runQuery(db,
        'INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)',
        ['Get Links Project', Date.now()]
      );
      localProjectId = proj.lastID;
    });

    it('should return empty array when no links exist', async () => {
      const result = await projectLinkService.getByProjectId(db, localProjectId);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return all active links for a project', async () => {
      await projectLinkService.create(db, localProjectId, { projectlink_label: 'Docs', projectlink_URL: 'https://docs.example.com' });
      await projectLinkService.create(db, localProjectId, { projectlink_label: 'Jira', projectlink_URL: 'https://jira.example.com' });
      const result = await projectLinkService.getByProjectId(db, localProjectId);
      expect(result.length).toBe(2);
    });

    it('should not return soft-deleted links', async () => {
      const created = await projectLinkService.create(db, localProjectId, { projectlink_label: 'Deleted', projectlink_URL: 'https://deleted.example.com' });
      await projectLinkService.softDelete(db, created.lastID);
      const result = await projectLinkService.getByProjectId(db, localProjectId);
      expect(result.find(l => l.id === created.lastID)).toBeUndefined();
    });

    it('should return links ordered by createdate descending', async () => {
      const proj2 = await runQuery(db, 'INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)', ['Order Project', Date.now()]);
      await projectLinkService.create(db, proj2.lastID, { projectlink_label: 'A', projectlink_URL: 'https://a.com' });
      await projectLinkService.create(db, proj2.lastID, { projectlink_label: 'B', projectlink_URL: 'https://b.com' });
      const result = await projectLinkService.getByProjectId(db, proj2.lastID);
      expect(result[0].projectlink_createdate).toBeGreaterThanOrEqual(result[1].projectlink_createdate);
    });
  });

  describe('update', () => {
    let linkId;

    beforeAll(async () => {
      const result = await projectLinkService.create(db, projectId, {
        projectlink_label: 'Original',
        projectlink_URL: 'https://original.com'
      });
      linkId = result.lastID;
    });

    it('should update label', async () => {
      const result = await projectLinkService.update(db, linkId, { projectlink_label: 'Updated' });
      expect(result.changes).toBe(1);
      const row = await getOne(db, 'SELECT * FROM project_links WHERE id = ?', [linkId]);
      expect(row.projectlink_label).toBe('Updated');
    });

    it('should update URL', async () => {
      const result = await projectLinkService.update(db, linkId, { projectlink_URL: 'https://updated.com' });
      expect(result.changes).toBe(1);
      const row = await getOne(db, 'SELECT * FROM project_links WHERE id = ?', [linkId]);
      expect(row.projectlink_URL).toBe('https://updated.com');
    });

    it('should set projectlink_updatedate on update', async () => {
      await projectLinkService.update(db, linkId, { projectlink_label: 'Check Date' });
      const row = await getOne(db, 'SELECT projectlink_updatedate FROM project_links WHERE id = ?', [linkId]);
      expect(row.projectlink_updatedate).toBeGreaterThan(0);
    });

    it('should return changes=0 for non-existent link', async () => {
      const result = await projectLinkService.update(db, 99999, { projectlink_label: 'Ghost' });
      expect(result.changes).toBe(0);
    });

    it('should return changes=0 when no fields provided', async () => {
      const result = await projectLinkService.update(db, linkId, {});
      expect(result.changes).toBe(0);
    });
  });

  describe('softDelete', () => {
    it('should soft-delete a link', async () => {
      const created = await projectLinkService.create(db, projectId, { projectlink_label: 'ToDelete', projectlink_URL: 'https://todelete.com' });
      const result = await projectLinkService.softDelete(db, created.lastID);
      expect(result.changes).toBe(1);
      const row = await getOne(db, 'SELECT projectlink_is_deleted FROM project_links WHERE id = ?', [created.lastID]);
      expect(row.projectlink_is_deleted).toBe(1);
    });

    it('should not delete an already-deleted link', async () => {
      const created = await projectLinkService.create(db, projectId, { projectlink_label: 'DoubleDelete', projectlink_URL: 'https://dd.com' });
      await projectLinkService.softDelete(db, created.lastID);
      const result = await projectLinkService.softDelete(db, created.lastID);
      expect(result.changes).toBe(0);
    });

    it('should return changes=0 for non-existent link', async () => {
      const result = await projectLinkService.softDelete(db, 99999);
      expect(result.changes).toBe(0);
    });
  });
});
