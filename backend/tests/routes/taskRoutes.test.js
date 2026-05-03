const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken } = require('../helpers/testAuth');
const { runQuery } = require('../../config/database');

let db, app, projectId, taskId, followupId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);

  const now = Date.now();
  const proj = await runQuery(db,
    "INSERT INTO projects (project_name, division_id, project_create_date, project_update_date) VALUES (?, 1, ?, ?)",
    ['Route Task Project', now, now]
  );
  projectId = proj.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/tasks?project_id=:id', () => {
  it('returns empty array when no tasks', async () => {
    const res = await request(app)
      .get(`/api/tasks?project_id=${projectId}`)
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get(`/api/tasks?project_id=${projectId}`);
    expect(res.status).toBe(401);
  });

  it('returns 400 without project_id', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/tasks', () => {
  it('creates a task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_id: projectId, task_title: 'First route task' });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
    taskId = res.body.data.id;
  });

  it('returns 400 without task_title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_id: projectId });
    expect(res.status).toBe(400);
  });

  it('returns 400 without project_id', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', ['token=' + adminToken()])
      .send({ task_title: 'No project' });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ project_id: projectId, task_title: 'No auth' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns task with followups', async () => {
    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.data.task_title).toBe('First route task');
    expect(Array.isArray(res.body.data.followups)).toBe(true);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .get('/api/tasks/99999')
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get(`/api/tasks/${taskId}`);
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/tasks/:id', () => {
  it('updates task title', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ task_title: 'Updated route task' });
    expect(res.status).toBe(200);
  });

  it('updates task status', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ task_status: 'in_progress' });
    expect(res.status).toBe(200);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).put(`/api/tasks/${taskId}`).send({ task_title: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/tasks/:id/close', () => {
  let closeTaskId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_id: projectId, task_title: 'Close route task' });
    closeTaskId = res.body.data.id;
  });

  it('closes a task', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${closeTaskId}/close`)
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(200);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).patch(`/api/tasks/${closeTaskId}/close`);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes a task', async () => {
    const create = await request(app)
      .post('/api/tasks')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_id: projectId, task_title: 'Delete me route' });
    const id = create.body.data.id;
    const res = await request(app)
      .delete(`/api/tasks/${id}`)
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(200);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete(`/api/tasks/${taskId}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/tasks/:id/followups', () => {
  it('creates a followup', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/followups`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ followup_note: 'Route followup note' });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
    followupId = res.body.data.id;
  });

  it('returns 400 without followup_note', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/followups`)
      .set('Cookie', ['token=' + adminToken()])
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/followups`)
      .send({ followup_note: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/tasks/:id/followups/:followupId', () => {
  it('updates a followup', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}/followups/${followupId}`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ followup_note: 'Updated followup' });
    expect(res.status).toBe(200);
  });

  it('returns 400 without followup_note', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}/followups/${followupId}`)
      .set('Cookie', ['token=' + adminToken()])
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}/followups/${followupId}`)
      .send({ followup_note: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/tasks/:id/followups/:followupId', () => {
  it('deletes a followup', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskId}/followups/${followupId}`)
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(200);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskId}/followups/${followupId}`);
    expect(res.status).toBe(401);
  });
});

describe('error handling', () => {
  const taskService = require('../../services/taskService');

  afterEach(() => jest.restoreAllMocks());

  it('GET /api/tasks returns 500 on service error', async () => {
    jest.spyOn(taskService, 'getByProjectId').mockRejectedValueOnce(new Error('db error'));
    const res = await request(app)
      .get(`/api/tasks?project_id=${projectId}`)
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(500);
  });

  it('POST /api/tasks returns 500 on service error', async () => {
    jest.spyOn(taskService, 'create').mockRejectedValueOnce(new Error('db error'));
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_id: projectId, task_title: 'error test' });
    expect(res.status).toBe(500);
  });

  it('GET /api/tasks/:id returns 500 on service error', async () => {
    jest.spyOn(taskService, 'getById').mockRejectedValueOnce(new Error('db error'));
    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(500);
  });
});
