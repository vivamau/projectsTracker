const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const projectManagerService = require('../../services/projectManagerService');
const { runQuery, getOne } = require('../../config/database');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('projectManagerService.create', () => {
  it('should create a project manager from a user', async () => {
    const result = await projectManagerService.create(db, { user_id: 1 });
    expect(result.lastID).toBeDefined();
    expect(result.changes).toBe(1);
  });

  it('should create a project manager for another user', async () => {
    const result = await projectManagerService.create(db, { user_id: 2 });
    expect(result.lastID).toBeDefined();
  });
});

describe('projectManagerService.getAll', () => {
  it('should return all project managers with user info', async () => {
    const pms = await projectManagerService.getAll(db);
    expect(pms.length).toBeGreaterThanOrEqual(2);
    expect(pms[0].user_name).toBeDefined();
    expect(pms[0].user_email).toBeDefined();
  });
});

describe('projectManagerService.getById', () => {
  it('should return a project manager by id', async () => {
    const pm = await projectManagerService.getById(db, 1);
    expect(pm).toBeDefined();
    expect(pm.user_name).toBeDefined();
  });

  it('should return null for non-existent id', async () => {
    const pm = await projectManagerService.getById(db, 99999);
    expect(pm).toBeNull();
  });
});

describe('projectManagerService.getByProjectId', () => {
  let projectId;

  beforeAll(async () => {
    const proj = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
      ['PM Test Project', Date.now(), 1]
    );
    projectId = proj.lastID;

    // Create a PM and link with division
    const pm = await projectManagerService.create(db, { user_id: 1 });
    await projectManagerService.linkToProject(db, projectId, pm.lastID, 1);
  });

  it('should return project managers with their division for the project', async () => {
    const pms = await projectManagerService.getByProjectId(db, projectId);
    expect(pms.length).toBe(1);
    expect(pms[0].user_name).toBeDefined();
    expect(pms[0].user_email).toBeDefined();
    expect(pms[0].division_id).toBe(1);
    expect(pms[0].division_name).toBe('Engineering');
  });

  it('should return empty array for project with no PMs', async () => {
    const pms = await projectManagerService.getByProjectId(db, 99999);
    expect(pms).toEqual([]);
  });
});

describe('projectManagerService.linkToProject / unlinkFromProject', () => {
  let projectId, pmId;

  beforeAll(async () => {
    const proj = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
      ['Link PM Project', Date.now(), 1]
    );
    projectId = proj.lastID;
    const pm = await projectManagerService.create(db, { user_id: 2 });
    pmId = pm.lastID;
  });

  it('should link a PM to a project with a division', async () => {
    const result = await projectManagerService.linkToProject(db, projectId, pmId, 1);
    expect(result.lastID).toBeDefined();
  });

  it('should unlink a PM from a project', async () => {
    const result = await projectManagerService.unlinkFromProject(db, projectId, pmId);
    expect(result.changes).toBe(1);
  });

  it('should return changes=0 when unlinking non-existent link', async () => {
    const result = await projectManagerService.unlinkFromProject(db, 99999, 99999);
    expect(result.changes).toBe(0);
  });
});

describe('projectManagerService.syncProjectManagers', () => {
  let projectId;

  beforeAll(async () => {
    const proj = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
      ['Sync PM Project', Date.now(), 1]
    );
    projectId = proj.lastID;
  });

  it('should sync PMs with division assignments', async () => {
    await projectManagerService.syncProjectManagers(db, projectId, [
      { user_id: 1, division_id: 1 },
      { user_id: 2, division_id: 1 }
    ]);
    const pms = await projectManagerService.getByProjectId(db, projectId);
    expect(pms.length).toBe(2);
    expect(pms[0].division_id).toBe(1);
  });

  it('should replace PMs when syncing with different assignments', async () => {
    await projectManagerService.syncProjectManagers(db, projectId, [
      { user_id: 3, division_id: 1 }
    ]);
    const pms = await projectManagerService.getByProjectId(db, projectId);
    expect(pms.length).toBe(1);
    expect(pms[0].user_id).toBe(3);
  });

  it('should allow a PM with no division', async () => {
    await projectManagerService.syncProjectManagers(db, projectId, [
      { user_id: 1 }
    ]);
    const pms = await projectManagerService.getByProjectId(db, projectId);
    expect(pms.length).toBe(1);
    expect(pms[0].division_id).toBeNull();
  });

  it('should clear all PMs when syncing with empty array', async () => {
    await projectManagerService.syncProjectManagers(db, projectId, []);
    const pms = await projectManagerService.getByProjectId(db, projectId);
    expect(pms.length).toBe(0);
  });

  it('should persist start_date, end_date, and percentage when syncing', async () => {
    const startDate = new Date('2024-01-15').getTime();
    const endDate = new Date('2024-12-31').getTime();
    await projectManagerService.syncProjectManagers(db, projectId, [
      { user_id: 1, division_id: 1, start_date: startDate, end_date: endDate, percentage: 75 }
    ]);
    const pms = await projectManagerService.getByProjectId(db, projectId);
    expect(pms.length).toBe(1);
    expect(pms[0].project_to_projectmanager_start_date).toBe(startDate);
    expect(pms[0].project_to_projectmanager_end_date).toBe(endDate);
    expect(pms[0].project_to_projectmanager_percentage).toBe(75);
  });

  it('should default start_date to now when not provided', async () => {
    const before = Date.now();
    await projectManagerService.syncProjectManagers(db, projectId, [
      { user_id: 2, division_id: 1 }
    ]);
    const after = Date.now();
    const pms = await projectManagerService.getByProjectId(db, projectId);
    expect(pms[0].project_to_projectmanager_start_date).toBeGreaterThanOrEqual(before);
    expect(pms[0].project_to_projectmanager_start_date).toBeLessThanOrEqual(after);
    expect(pms[0].project_to_projectmanager_end_date).toBeNull();
    expect(pms[0].project_to_projectmanager_percentage).toBeNull();
  });
});
