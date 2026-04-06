const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const activityService = require('../../services/activityService');
const { runQuery } = require('../../config/database');

let db;
let projectId;
const now = Date.now();

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  const result = await runQuery(db,
    "INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)",
    ['Activity Test Project', now]
  );
  projectId = result.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('activityService.getByProjectId', () => {
  it('should return an empty array when project has no activities', async () => {
    const result = await activityService.getByProjectId(db, projectId);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('should return activities ordered by activity_from ascending', async () => {
    await runQuery(db,
      `INSERT INTO activities (project_id, activity_from, activity_to,
        activity_planned_tickets, activity_closed_tickets,
        activity_bug_tickets, activity_bug_closed_tickets, activity_create_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, now - 200000, now - 100000, 10, 8, 2, 1, now]
    );
    await runQuery(db,
      `INSERT INTO activities (project_id, activity_from, activity_to,
        activity_planned_tickets, activity_closed_tickets,
        activity_bug_tickets, activity_bug_closed_tickets, activity_create_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, now - 400000, now - 300000, 5, 4, 1, 0, now]
    );

    const result = await activityService.getByProjectId(db, projectId);
    expect(result.length).toBe(2);
    expect(result[0].activity_from).toBeLessThan(result[1].activity_from);
  });

  it('should return correct ticket fields', async () => {
    const result = await activityService.getByProjectId(db, projectId);
    const last = result[result.length - 1];
    expect(last).toHaveProperty('activity_planned_tickets');
    expect(last).toHaveProperty('activity_closed_tickets');
    expect(last).toHaveProperty('activity_bug_tickets');
    expect(last).toHaveProperty('activity_bug_closed_tickets');
    expect(last).toHaveProperty('activity_from');
    expect(last).toHaveProperty('activity_to');
    expect(last.activity_planned_tickets).toBe(10);
    expect(last.activity_closed_tickets).toBe(8);
  });

  it('should not return activities from other projects', async () => {
    const other = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)",
      ['Other Project', now]
    );
    await runQuery(db,
      `INSERT INTO activities (project_id, activity_from, activity_to,
        activity_planned_tickets, activity_closed_tickets,
        activity_bug_tickets, activity_bug_closed_tickets, activity_create_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [other.lastID, now, now + 100000, 99, 99, 0, 0, now]
    );

    const result = await activityService.getByProjectId(db, projectId);
    const ids = result.map(r => r.project_id);
    expect(ids.every(id => id === projectId)).toBe(true);
  });

  it('should not return soft-deleted activities', async () => {
    await runQuery(db,
      `INSERT INTO activities (project_id, activity_from, activity_to,
        activity_planned_tickets, activity_closed_tickets,
        activity_bug_tickets, activity_bug_closed_tickets,
        activity_create_date, activity_is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [projectId, now + 200000, now + 300000, 20, 18, 3, 2, now]
    );

    const before = await activityService.getByProjectId(db, projectId);
    before.forEach(a => expect(a.activity_is_deleted).not.toBe(1));
  });
});
