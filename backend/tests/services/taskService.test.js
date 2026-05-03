const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { runQuery } = require('../../config/database');
const taskService = require('../../services/taskService');

let db, projectId, userId, assigneeId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  // Seed a project status and project
  const now = Date.now();
  await runQuery(db, "INSERT INTO project_statuses (project_status_name, project_status_create_date) VALUES ('Active', ?)", [now]);
  const proj = await runQuery(db,
    "INSERT INTO projects (project_name, division_id, project_create_date, project_update_date) VALUES (?, 1, ?, ?)",
    ['Task Test Project', now, now]
  );
  projectId = proj.lastID;
  userId = 2;
  assigneeId = 3;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('taskService.create', () => {
  it('creates a task assigned to the whole team', async () => {
    const result = await taskService.create(db, {
      project_id: projectId,
      task_title: 'Team task',
      task_description: 'Do something',
      created_by_user_id: userId,
    });
    expect(result.lastID).toBeGreaterThan(0);
  });

  it('creates a task assigned to a specific user', async () => {
    const result = await taskService.create(db, {
      project_id: projectId,
      task_title: 'Individual task',
      task_assigned_to_user_id: assigneeId,
      task_due_date: '2026-06-01',
      created_by_user_id: userId,
    });
    expect(result.lastID).toBeGreaterThan(0);
  });

  it('defaults task_status to open', async () => {
    const result = await taskService.create(db, {
      project_id: projectId,
      task_title: 'Status check task',
      created_by_user_id: userId,
    });
    const task = await taskService.getById(db, result.lastID);
    expect(task.task_status).toBe('open');
  });

  it('returns error when task_title is missing', async () => {
    await expect(
      taskService.create(db, { project_id: projectId, created_by_user_id: userId })
    ).rejects.toThrow();
  });
});

describe('taskService.getByProjectId', () => {
  let localProjectId;

  beforeAll(async () => {
    const now = Date.now();
    const proj = await runQuery(db,
      "INSERT INTO projects (project_name, division_id, project_create_date, project_update_date) VALUES (?, 1, ?, ?)",
      ['Get Tasks Project', now, now]
    );
    localProjectId = proj.lastID;

    await taskService.create(db, { project_id: localProjectId, task_title: 'Alpha', created_by_user_id: userId });
    await taskService.create(db, {
      project_id: localProjectId,
      task_title: 'Beta',
      task_assigned_to_user_id: assigneeId,
      created_by_user_id: userId,
    });
  });

  it('returns all tasks for a project', async () => {
    const tasks = await taskService.getByProjectId(db, localProjectId);
    expect(tasks.length).toBe(2);
  });

  it('includes assignee name when assigned to a user', async () => {
    const tasks = await taskService.getByProjectId(db, localProjectId);
    const assigned = tasks.find(t => t.task_title === 'Beta');
    expect(assigned.assignee_name).toBeTruthy();
  });

  it('has null assignee fields for team tasks', async () => {
    const tasks = await taskService.getByProjectId(db, localProjectId);
    const teamTask = tasks.find(t => t.task_title === 'Alpha');
    expect(teamTask.task_assigned_to_user_id).toBeNull();
  });

  it('returns empty array for unknown project', async () => {
    const tasks = await taskService.getByProjectId(db, 99999);
    expect(tasks).toEqual([]);
  });
});

describe('taskService.getById', () => {
  let taskId;

  beforeAll(async () => {
    const result = await taskService.create(db, {
      project_id: projectId,
      task_title: 'Detail task',
      task_description: 'Check detail',
      created_by_user_id: userId,
    });
    taskId = result.lastID;
  });

  it('returns the task with followups array', async () => {
    const task = await taskService.getById(db, taskId);
    expect(task.task_title).toBe('Detail task');
    expect(Array.isArray(task.followups)).toBe(true);
  });

  it('returns null for unknown id', async () => {
    const task = await taskService.getById(db, 99999);
    expect(task).toBeNull();
  });
});

describe('taskService.update', () => {
  let taskId;

  beforeAll(async () => {
    const result = await taskService.create(db, {
      project_id: projectId,
      task_title: 'Update me',
      created_by_user_id: userId,
    });
    taskId = result.lastID;
  });

  it('updates task_title', async () => {
    await taskService.update(db, taskId, { task_title: 'Updated title' });
    const task = await taskService.getById(db, taskId);
    expect(task.task_title).toBe('Updated title');
  });

  it('updates task_status to in_progress', async () => {
    await taskService.update(db, taskId, { task_status: 'in_progress' });
    const task = await taskService.getById(db, taskId);
    expect(task.task_status).toBe('in_progress');
  });

  it('updates assignee', async () => {
    await taskService.update(db, taskId, { task_assigned_to_user_id: assigneeId });
    const task = await taskService.getById(db, taskId);
    expect(task.task_assigned_to_user_id).toBe(assigneeId);
  });

  it('clears assignee to null', async () => {
    await taskService.update(db, taskId, { task_assigned_to_user_id: null });
    const task = await taskService.getById(db, taskId);
    expect(task.task_assigned_to_user_id).toBeNull();
  });

  it('returns {changes: 0} for empty update', async () => {
    const result = await taskService.update(db, taskId, {});
    expect(result.changes).toBe(0);
  });
});

describe('taskService.close', () => {
  let taskId;

  beforeAll(async () => {
    const result = await taskService.create(db, {
      project_id: projectId,
      task_title: 'Close me',
      created_by_user_id: userId,
    });
    taskId = result.lastID;
  });

  it('sets status to closed and records close_date', async () => {
    await taskService.close(db, taskId);
    const task = await taskService.getById(db, taskId);
    expect(task.task_status).toBe('closed');
    expect(task.task_close_date).toBeGreaterThan(0);
  });
});

describe('taskService.softDelete', () => {
  it('soft-deletes a task', async () => {
    const result = await taskService.create(db, {
      project_id: projectId,
      task_title: 'Delete me',
      created_by_user_id: userId,
    });
    const taskId = result.lastID;
    await taskService.softDelete(db, taskId);
    const task = await taskService.getById(db, taskId);
    expect(task).toBeNull();
  });

  it('does not affect already-deleted tasks', async () => {
    const result = await taskService.create(db, {
      project_id: projectId,
      task_title: 'Already gone',
      created_by_user_id: userId,
    });
    const taskId = result.lastID;
    await taskService.softDelete(db, taskId);
    const r2 = await taskService.softDelete(db, taskId);
    expect(r2.changes).toBe(0);
  });
});

describe('taskService followups', () => {
  let taskId;

  beforeAll(async () => {
    const result = await taskService.create(db, {
      project_id: projectId,
      task_title: 'Followup task',
      created_by_user_id: userId,
    });
    taskId = result.lastID;
  });

  it('creates a followup', async () => {
    const result = await taskService.createFollowup(db, {
      task_id: taskId,
      followup_note: 'First update',
      user_id: userId,
    });
    expect(result.lastID).toBeGreaterThan(0);
  });

  it('getFollowupsByTaskId returns followups ordered by date desc', async () => {
    await taskService.createFollowup(db, { task_id: taskId, followup_note: 'Second update', user_id: userId });
    const followups = await taskService.getFollowupsByTaskId(db, taskId);
    expect(followups.length).toBeGreaterThanOrEqual(2);
  });

  it('getById includes followups', async () => {
    const task = await taskService.getById(db, taskId);
    expect(task.followups.length).toBeGreaterThanOrEqual(2);
  });

  it('followup includes author name', async () => {
    const followups = await taskService.getFollowupsByTaskId(db, taskId);
    expect(followups[0].author_name).toBeTruthy();
  });

  it('updates a followup', async () => {
    const result = await taskService.createFollowup(db, {
      task_id: taskId,
      followup_note: 'To be edited',
      user_id: userId,
    });
    await taskService.updateFollowup(db, result.lastID, { followup_note: 'Edited note' });
    const followups = await taskService.getFollowupsByTaskId(db, taskId);
    const updated = followups.find(f => f.id === result.lastID);
    expect(updated.followup_note).toBe('Edited note');
  });

  it('deletes a followup', async () => {
    const result = await taskService.createFollowup(db, {
      task_id: taskId,
      followup_note: 'Ephemeral',
      user_id: userId,
    });
    await taskService.deleteFollowup(db, result.lastID);
    const followups = await taskService.getFollowupsByTaskId(db, taskId);
    const found = followups.find(f => f.id === result.lastID);
    expect(found).toBeUndefined();
  });
});
