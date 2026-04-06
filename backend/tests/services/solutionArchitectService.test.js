const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const solutionArchitectService = require('../../services/solutionArchitectService');
const { runQuery } = require('../../config/database');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('solutionArchitectService.create', () => {
  it('should create a solution architect from a user', async () => {
    const result = await solutionArchitectService.create(db, { user_id: 1 });
    expect(result.lastID).toBeDefined();
    expect(result.changes).toBe(1);
  });

  it('should create a solution architect for another user', async () => {
    const result = await solutionArchitectService.create(db, { user_id: 2 });
    expect(result.lastID).toBeDefined();
  });
});

describe('solutionArchitectService.getByProjectId', () => {
  let projectId;

  beforeAll(async () => {
    const proj = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
      ['SA Test Project', Date.now(), 1]
    );
    projectId = proj.lastID;

    await solutionArchitectService.syncSolutionArchitects(db, projectId, [
      { user_id: 1, division_id: 1 }
    ]);
  });

  it('should return solution architects with division info for the project', async () => {
    const sas = await solutionArchitectService.getByProjectId(db, projectId);
    expect(sas.length).toBe(1);
    expect(sas[0].user_name).toBeDefined();
    expect(sas[0].user_email).toBeDefined();
    expect(sas[0].division_id).toBe(1);
    expect(sas[0].division_name).toBe('Engineering');
  });

  it('should return empty array for project with no SAs', async () => {
    const sas = await solutionArchitectService.getByProjectId(db, 99999);
    expect(sas).toEqual([]);
  });
});

describe('solutionArchitectService.syncSolutionArchitects', () => {
  let projectId;

  beforeAll(async () => {
    const proj = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
      ['Sync SA Project', Date.now(), 1]
    );
    projectId = proj.lastID;
  });

  it('should sync SAs with division assignments', async () => {
    await solutionArchitectService.syncSolutionArchitects(db, projectId, [
      { user_id: 1, division_id: 1 },
      { user_id: 2, division_id: 1 }
    ]);
    const sas = await solutionArchitectService.getByProjectId(db, projectId);
    expect(sas.length).toBe(2);
    expect(sas[0].division_id).toBe(1);
  });

  it('should replace SAs when syncing with different assignments', async () => {
    await solutionArchitectService.syncSolutionArchitects(db, projectId, [
      { user_id: 3, division_id: 1 }
    ]);
    const sas = await solutionArchitectService.getByProjectId(db, projectId);
    expect(sas.length).toBe(1);
    expect(sas[0].user_id).toBe(3);
  });

  it('should allow a SA with no division', async () => {
    await solutionArchitectService.syncSolutionArchitects(db, projectId, [
      { user_id: 1 }
    ]);
    const sas = await solutionArchitectService.getByProjectId(db, projectId);
    expect(sas.length).toBe(1);
    expect(sas[0].division_id).toBeNull();
  });

  it('should clear all SAs when syncing with empty array', async () => {
    await solutionArchitectService.syncSolutionArchitects(db, projectId, []);
    const sas = await solutionArchitectService.getByProjectId(db, projectId);
    expect(sas.length).toBe(0);
  });

  it('should reuse existing SA record for the same user', async () => {
    await solutionArchitectService.syncSolutionArchitects(db, projectId, [
      { user_id: 1, division_id: 1 }
    ]);
    const sas1 = await solutionArchitectService.getByProjectId(db, projectId);

    await solutionArchitectService.syncSolutionArchitects(db, projectId, [
      { user_id: 1, division_id: 1 }
    ]);
    const sas2 = await solutionArchitectService.getByProjectId(db, projectId);

    expect(sas1[0].id).toBe(sas2[0].id);
  });
});
