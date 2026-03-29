const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { runQuery } = require('../../config/database');
const healthStatusService = require('../../services/healthStatusService');

let db;
let testProjectId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  // Create a test project
  const now = Date.now();
  const result = await runQuery(db,
    'INSERT INTO projects (project_name, project_create_date, division_id, user_id, initiative_id, deliverypath_id) VALUES (?, ?, ?, ?, ?, ?)',
    ['Health Test Project', now, 1, 1, 1, 1]
  );
  testProjectId = result.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('healthStatusService', () => {
  describe('create', () => {
    it('should create a health status with value Red (1)', async () => {
      const result = await healthStatusService.create(db, {
        project_id: testProjectId,
        healthstatus_value: 1,
        healthstatus_comment: 'Project is at risk'
      });
      expect(result.lastID).toBeGreaterThan(0);
    });

    it('should create a health status with value Yellow (2)', async () => {
      const result = await healthStatusService.create(db, {
        project_id: testProjectId,
        healthstatus_value: 2,
        healthstatus_comment: 'Some concerns'
      });
      expect(result.lastID).toBeGreaterThan(0);
    });

    it('should create a health status with value Green (3)', async () => {
      const result = await healthStatusService.create(db, {
        project_id: testProjectId,
        healthstatus_value: 3,
        healthstatus_comment: 'On track'
      });
      expect(result.lastID).toBeGreaterThan(0);
    });

    it('should create a health status without comment', async () => {
      const result = await healthStatusService.create(db, {
        project_id: testProjectId,
        healthstatus_value: 3
      });
      expect(result.lastID).toBeGreaterThan(0);
    });
  });

  describe('getByProjectId', () => {
    it('should return health statuses ordered by date DESC', async () => {
      const statuses = await healthStatusService.getByProjectId(db, testProjectId);
      expect(statuses.length).toBeGreaterThanOrEqual(3);
      // Most recent first
      for (let i = 0; i < statuses.length - 1; i++) {
        expect(statuses[i].healthstatus_create_date).toBeGreaterThanOrEqual(
          statuses[i + 1].healthstatus_create_date
        );
      }
    });

    it('should return empty array for project with no statuses', async () => {
      const statuses = await healthStatusService.getByProjectId(db, 9999);
      expect(statuses).toEqual([]);
    });
  });

  describe('getLatest', () => {
    it('should return the latest health status', async () => {
      const latest = await healthStatusService.getLatest(db, testProjectId);
      expect(latest).not.toBeNull();
      // The last one we created was Green (3) without comment
      expect(latest.healthstatus_value).toBe(3);
    });

    it('should return null for project with no statuses', async () => {
      const latest = await healthStatusService.getLatest(db, 9999);
      expect(latest).toBeNull();
    });
  });
});
