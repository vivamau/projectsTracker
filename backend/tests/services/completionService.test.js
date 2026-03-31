const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const completionService = require('../../services/completionService');
const { runQuery } = require('../../config/database');

let db;
let projectId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  // Create a test project
  const result = await runQuery(db,
    "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
    ['Milestone Project', Date.now(), 1]
  );
  projectId = result.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('completionService.create', () => {
  it('should create a completion milestone', async () => {
    const result = await completionService.create(db, {
      project_id: projectId,
      completion_value: 25,
      completion_comment: 'Requirements gathered',
      user_id: 1
    });

    expect(result.lastID).toBeDefined();
    expect(result.changes).toBe(1);
  });

  it('should create a milestone without comment', async () => {
    const result = await completionService.create(db, {
      project_id: projectId,
      completion_value: 50,
      user_id: 1
    });

    expect(result.lastID).toBeDefined();
  });

  it('should create a milestone without user_id', async () => {
    const result = await completionService.create(db, {
      project_id: projectId,
      completion_value: 10
    });

    expect(result.lastID).toBeDefined();
  });

  it('should create a milestone with start and end dates', async () => {
    const startDate = Date.now();
    const endDate = Date.now() + 86400000; // 1 day later
    const result = await completionService.create(db, {
      project_id: projectId,
      completion_value: 35,
      completion_comment: 'Milestone with dates',
      completion_start_date: startDate,
      completion_end_date: endDate,
      user_id: 1
    });

    expect(result.lastID).toBeDefined();
    expect(result.changes).toBe(1);
  });

  it('should create a milestone with only start date', async () => {
    const startDate = Date.now();
    const result = await completionService.create(db, {
      project_id: projectId,
      completion_value: 40,
      completion_start_date: startDate,
      user_id: 1
    });

    expect(result.lastID).toBeDefined();
  });
});

describe('completionService.getByProjectId', () => {
  let testProjectId;

  beforeAll(async () => {
    const result = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
      ['Ordered Milestones Project', Date.now(), 1]
    );
    testProjectId = result.lastID;

    // Insert milestones with different dates
    await runQuery(db,
      "INSERT INTO completions (completion_value, completion_comment, completion_create_date, project_id, user_id) VALUES (?, ?, ?, ?, ?)",
      [10, 'Kickoff', Date.now() - 3000, testProjectId, 1]
    );
    await runQuery(db,
      "INSERT INTO completions (completion_value, completion_comment, completion_create_date, project_id, user_id) VALUES (?, ?, ?, ?, ?)",
      [50, 'Halfway', Date.now() - 2000, testProjectId, 1]
    );
    await runQuery(db,
      "INSERT INTO completions (completion_value, completion_comment, completion_create_date, project_id, user_id) VALUES (?, ?, ?, ?, ?)",
      [75, 'Almost done', Date.now() - 1000, testProjectId, 1]
    );
  });

  it('should return completions ordered by date descending', async () => {
    const results = await completionService.getByProjectId(db, testProjectId);

    expect(results.length).toBe(3);
    expect(results[0].completion_value).toBe(75);
    expect(results[1].completion_value).toBe(50);
    expect(results[2].completion_value).toBe(10);
  });

  it('should include user name in results', async () => {
    const results = await completionService.getByProjectId(db, testProjectId);

    expect(results[0].user_name).toBeDefined();
  });

  it('should not return soft-deleted completions', async () => {
    await runQuery(db,
      "INSERT INTO completions (completion_value, completion_comment, completion_create_date, project_id, user_id, completion_is_deleted) VALUES (?, ?, ?, ?, ?, ?)",
      [100, 'Deleted milestone', Date.now(), testProjectId, 1, 1]
    );

    const results = await completionService.getByProjectId(db, testProjectId);
    const deleted = results.find(r => r.completion_comment === 'Deleted milestone');
    expect(deleted).toBeUndefined();
  });

  it('should return empty array for project with no completions', async () => {
    const emptyProject = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
      ['Empty Project', Date.now(), 1]
    );
    const results = await completionService.getByProjectId(db, emptyProject.lastID);
    expect(results).toEqual([]);
  });
});

describe('completionService.getLatest', () => {
  let testProjectId;

  beforeAll(async () => {
    const result = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
      ['Latest Milestone Project', Date.now(), 1]
    );
    testProjectId = result.lastID;

    await runQuery(db,
      "INSERT INTO completions (completion_value, completion_comment, completion_create_date, project_id, user_id) VALUES (?, ?, ?, ?, ?)",
      [20, 'First', Date.now() - 2000, testProjectId, 1]
    );
    await runQuery(db,
      "INSERT INTO completions (completion_value, completion_comment, completion_create_date, project_id, user_id) VALUES (?, ?, ?, ?, ?)",
      [60, 'Latest', Date.now() - 1000, testProjectId, 1]
    );
  });

  it('should return the most recent completion', async () => {
    const latest = await completionService.getLatest(db, testProjectId);

    expect(latest).toBeDefined();
    expect(latest.completion_value).toBe(60);
    expect(latest.completion_comment).toBe('Latest');
  });

  it('should return null for project with no completions', async () => {
    const latest = await completionService.getLatest(db, 99999);
    expect(latest).toBeNull();
  });

  it('should not return soft-deleted completions', async () => {
    const proj = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
      ['Only Deleted Project', Date.now(), 1]
    );
    await runQuery(db,
      "INSERT INTO completions (completion_value, completion_comment, completion_create_date, project_id, user_id, completion_is_deleted) VALUES (?, ?, ?, ?, ?, ?)",
      [100, 'Deleted', Date.now(), proj.lastID, 1, 1]
    );

    const latest = await completionService.getLatest(db, proj.lastID);
    expect(latest).toBeNull();
  });
});

describe('completionService.update', () => {
  let completionId;

  beforeAll(async () => {
    const result = await runQuery(db,
      "INSERT INTO completions (completion_value, completion_comment, completion_create_date, project_id, user_id) VALUES (?, ?, ?, ?, ?)",
      [30, 'Update me', Date.now(), projectId, 1]
    );
    completionId = result.lastID;
  });

  it('should update completion value and comment', async () => {
    const result = await completionService.update(db, completionId, {
      completion_value: 45,
      completion_comment: 'Updated milestone'
    });

    expect(result.changes).toBe(1);
  });

  it('should update only the comment', async () => {
    const result = await completionService.update(db, completionId, {
      completion_comment: 'Comment only update'
    });

    expect(result.changes).toBe(1);
  });

  it('should return changes=0 for non-existent completion', async () => {
    const result = await completionService.update(db, 99999, {
      completion_value: 50
    });

    expect(result.changes).toBe(0);
  });

  it('should update completion with start and end dates', async () => {
    const startDate = Date.now();
    const endDate = Date.now() + 86400000;
    const result = await completionService.update(db, completionId, {
      completion_start_date: startDate,
      completion_end_date: endDate
    });

    expect(result.changes).toBe(1);
  });

  it('should update completion with only end date', async () => {
    const endDate = Date.now() + 172800000; // 2 days from now
    const result = await completionService.update(db, completionId, {
      completion_end_date: endDate
    });

    expect(result.changes).toBe(1);
  });

  it('should return changes=0 when no fields provided', async () => {
    const result = await completionService.update(db, completionId, {});
    expect(result.changes).toBe(0);
  });
});

describe('completionService.softDelete', () => {
  let completionId;

  beforeAll(async () => {
    const result = await runQuery(db,
      "INSERT INTO completions (completion_value, completion_comment, completion_create_date, project_id, user_id) VALUES (?, ?, ?, ?, ?)",
      [80, 'Delete me', Date.now(), projectId, 1]
    );
    completionId = result.lastID;
  });

  it('should soft delete a completion', async () => {
    const result = await completionService.softDelete(db, completionId);
    expect(result.changes).toBe(1);
  });

  it('should not delete an already deleted completion', async () => {
    const result = await completionService.softDelete(db, completionId);
    expect(result.changes).toBe(0);
  });

  it('should return changes=0 for non-existent completion', async () => {
    const result = await completionService.softDelete(db, 99999);
    expect(result.changes).toBe(0);
  });
});
