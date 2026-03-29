const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken, guestToken } = require('../helpers/testAuth');
const { runQuery } = require('../../config/database');

let db, app, projectId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);

  // Create a test project
  const res = await request(app)
    .post('/api/projects')
    .set('Cookie', ['token=' + adminToken()])
    .send({ project_name: 'Completion Test Project', division_id: 1 });

  projectId = res.body.data.id;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/projects/:id/completions', () => {
  it('should list completions for a project', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/completions`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/completions`);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/projects/:id/completions', () => {
  it('should create a completion milestone as admin', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/completions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({
        completion_value: 25,
        completion_comment: 'Requirements complete'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  });

  it('should return 400 when completion_value is missing', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/completions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ completion_comment: 'No value' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when completion_value is out of range', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/completions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ completion_value: 150 });

    expect(res.status).toBe(400);
  });

  it('should return 400 when completion_value is negative', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/completions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ completion_value: -10 });

    expect(res.status).toBe(400);
  });

  it('should return 403 when reader tries to create', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/completions`)
      .set('Cookie', ['token=' + readerToken()])
      .send({ completion_value: 50 });

    expect(res.status).toBe(403);
  });

  it('should return 403 when guest tries to create', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/completions`)
      .set('Cookie', ['token=' + guestToken()])
      .send({ completion_value: 50 });

    expect(res.status).toBe(403);
  });

  it('should list created completions in order', async () => {
    await request(app)
      .post(`/api/projects/${projectId}/completions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ completion_value: 50, completion_comment: 'Halfway' });

    const res = await request(app)
      .get(`/api/projects/${projectId}/completions`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    // Most recent first
    expect(res.body.data[0].completion_value).toBe(50);
  });
});

describe('PUT /api/projects/:id/completions/:completionId', () => {
  let completionId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/completions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ completion_value: 60, completion_comment: 'Update me' });

    completionId = res.body.data.id;
  });

  it('should update a completion as admin', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/completions/${completionId}`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ completion_value: 65, completion_comment: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 for non-existent completion', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/completions/99999`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ completion_value: 70 });

    expect(res.status).toBe(404);
  });

  it('should return 403 when reader tries to update', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/completions/${completionId}`)
      .set('Cookie', ['token=' + readerToken()])
      .send({ completion_value: 70 });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/projects/:id/completions/:completionId', () => {
  let completionId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/completions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ completion_value: 90, completion_comment: 'Delete me' });

    completionId = res.body.data.id;
  });

  it('should soft delete a completion as admin', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}/completions/${completionId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 for non-existent completion', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}/completions/99999`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(404);
  });

  it('should return 403 when reader tries to delete', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}/completions/1`)
      .set('Cookie', ['token=' + readerToken()]);

    expect(res.status).toBe(403);
  });
});
