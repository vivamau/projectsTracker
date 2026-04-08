const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { runQuery } = require('../../config/database');
const projectAssignmentService = require('../../services/projectAssignmentService');

let db;
let projectId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  // Create a project to assign to
  const projRes = await runQuery(db,
    'INSERT INTO projects (project_name, project_create_date, division_id, user_id) VALUES (?, ?, ?, ?)',
    ['Assignment Test Project', Date.now(), 1, 1]
  );
  projectId = projRes.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('projectAssignmentService', () => {
  describe('getByProjectId', () => {
    it('should return empty array when no assignments exist', async () => {
      const result = await projectAssignmentService.getByProjectId(db, projectId);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return assignments with user, role and division info', async () => {
      await projectAssignmentService.syncForProject(db, projectId, [
        { user_id: 1, project_role_id: 1, division_id: 1, start_date: null, end_date: null, percentage: null }
      ]);
      const result = await projectAssignmentService.getByProjectId(db, projectId);
      expect(result.length).toBe(1);
      expect(result[0].user_id).toBe(1);
      expect(result[0].project_role_id).toBe(1);
      expect(result[0].role_name).toBe('Project Manager');
      expect(result[0].user_name).toBeDefined();
      expect(result[0].user_email).toBeDefined();
      expect(result[0].division_name).toBeDefined();
    });

    it('should return assignments ordered by role_name then user_name', async () => {
      // Add a second user as SA
      await runQuery(db,
        "INSERT INTO users (user_email, user_name, user_lastname, user_password_hash, user_create_date, userrole_id) VALUES (?, ?, ?, ?, ?, ?)",
        ['user5@test.com', 'Alice', 'Smith', 'hash', Date.now(), 1]
      );
      const u5 = await runQuery(db, "SELECT last_insert_rowid() as id");
      const u5id = (await runQuery(db, "SELECT id FROM users WHERE user_email='user5@test.com'"));

      const projRes2 = await runQuery(db,
        'INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)',
        ['Order Test Project', Date.now()]
      );
      await projectAssignmentService.syncForProject(db, projRes2.lastID, [
        { user_id: 1, project_role_id: 2, division_id: null, start_date: null, end_date: null, percentage: null },
        { user_id: 2, project_role_id: 1, division_id: null, start_date: null, end_date: null, percentage: null },
      ]);
      const result = await projectAssignmentService.getByProjectId(db, projRes2.lastID);
      expect(result[0].role_name).toBe('Project Manager');
      expect(result[1].role_name).toBe('Solution Architect');
    });
  });

  describe('syncForProject', () => {
    it('should insert new assignments', async () => {
      const projRes = await runQuery(db,
        'INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)',
        ['Sync Test 1', Date.now()]
      );
      await projectAssignmentService.syncForProject(db, projRes.lastID, [
        { user_id: 1, project_role_id: 1, division_id: 1, start_date: 1700000000000, end_date: null, percentage: 50 }
      ]);
      const result = await projectAssignmentService.getByProjectId(db, projRes.lastID);
      expect(result.length).toBe(1);
      expect(result[0].assignment_start_date).toBe(1700000000000);
      expect(result[0].assignment_percentage).toBe(50);
    });

    it('should replace existing assignments on re-sync', async () => {
      const projRes = await runQuery(db,
        'INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)',
        ['Sync Test 2', Date.now()]
      );
      await projectAssignmentService.syncForProject(db, projRes.lastID, [
        { user_id: 1, project_role_id: 1, division_id: null, start_date: null, end_date: null, percentage: null }
      ]);
      await projectAssignmentService.syncForProject(db, projRes.lastID, [
        { user_id: 2, project_role_id: 2, division_id: null, start_date: null, end_date: null, percentage: null }
      ]);
      const result = await projectAssignmentService.getByProjectId(db, projRes.lastID);
      expect(result.length).toBe(1);
      expect(result[0].user_id).toBe(2);
      expect(result[0].project_role_id).toBe(2);
    });

    it('should clear all assignments with empty array', async () => {
      const projRes = await runQuery(db,
        'INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)',
        ['Sync Test 3', Date.now()]
      );
      await projectAssignmentService.syncForProject(db, projRes.lastID, [
        { user_id: 1, project_role_id: 1, division_id: null, start_date: null, end_date: null, percentage: null }
      ]);
      await projectAssignmentService.syncForProject(db, projRes.lastID, []);
      const result = await projectAssignmentService.getByProjectId(db, projRes.lastID);
      expect(result.length).toBe(0);
    });

    it('should persist start_date, end_date and percentage', async () => {
      const projRes = await runQuery(db,
        'INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)',
        ['Sync Dates Test', Date.now()]
      );
      const start = 1710000000000;
      const end = 1720000000000;
      await projectAssignmentService.syncForProject(db, projRes.lastID, [
        { user_id: 1, project_role_id: 1, division_id: null, start_date: start, end_date: end, percentage: 75 }
      ]);
      const result = await projectAssignmentService.getByProjectId(db, projRes.lastID);
      expect(result[0].assignment_start_date).toBe(start);
      expect(result[0].assignment_end_date).toBe(end);
      expect(result[0].assignment_percentage).toBe(75);
    });

    it('should allow multiple users with different roles on same project', async () => {
      const projRes = await runQuery(db,
        'INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)',
        ['Multi-Role Project', Date.now()]
      );
      await projectAssignmentService.syncForProject(db, projRes.lastID, [
        { user_id: 1, project_role_id: 1, division_id: null, start_date: null, end_date: null, percentage: null },
        { user_id: 2, project_role_id: 2, division_id: null, start_date: null, end_date: null, percentage: null },
        { user_id: 3, project_role_id: 1, division_id: null, start_date: null, end_date: null, percentage: null },
      ]);
      const result = await projectAssignmentService.getByProjectId(db, projRes.lastID);
      expect(result.length).toBe(3);
    });
  });

  describe('getCountByRole', () => {
    it('should return counts per role', async () => {
      const counts = await projectAssignmentService.getCountByRole(db);
      expect(Array.isArray(counts)).toBe(true);
      counts.forEach(row => {
        expect(row.role_id).toBeDefined();
        expect(row.role_name).toBeDefined();
        expect(typeof row.count).toBe('number');
      });
    });
  });
});
