const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken } = require('../helpers/testAuth');
const { runQuery } = require('../../config/database');

let db, app, projectId, tecStack1Id, tecStack2Id;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);

  const proj = await request(app)
    .post('/api/projects')
    .set('Cookie', ['token=' + adminToken()])
    .send({ project_name: 'TecStack Test Project', division_id: 1 });
  projectId = proj.body.data.id;

  const now = Date.now();
  const ts1 = await runQuery(db,
    "INSERT INTO tec_stacks (tec_stack_name, tec_stack_type, tec_stack_support, tec_stack_create_date) VALUES (?, ?, ?, ?)",
    ['ReactJS', 'fe', 'Yes', now]
  );
  tecStack1Id = ts1.lastID;

  const ts2 = await runQuery(db,
    "INSERT INTO tec_stacks (tec_stack_name, tec_stack_type, tec_stack_support, tec_stack_create_date) VALUES (?, ?, ?, ?)",
    ['NodeJs', 'be', 'Yes', now]
  );
  tecStack2Id = ts2.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/tec-stacks', () => {
  it('should return all tec stacks when authenticated', async () => {
    const res = await request(app)
      .get('/api/tec-stacks')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/tec-stacks');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/projects/:id/tec-stacks', () => {
  it('should set tec stacks for a project as admin', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/tec-stacks`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ tec_stack_ids: [tecStack1Id, tecStack2Id] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return linked tec stacks in project detail', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    const stacks = res.body.data.tec_stacks;
    expect(Array.isArray(stacks)).toBe(true);
    expect(stacks.length).toBe(2);
    expect(stacks.map(s => s.tec_stack_name)).toContain('ReactJS');
    expect(stacks.map(s => s.tec_stack_name)).toContain('NodeJs');
  });

  it('should replace existing tec stacks on subsequent PUT', async () => {
    await request(app)
      .put(`/api/projects/${projectId}/tec-stacks`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ tec_stack_ids: [tecStack1Id] });

    const res = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.body.data.tec_stacks.length).toBe(1);
    expect(res.body.data.tec_stacks[0].tec_stack_name).toBe('ReactJS');
  });

  it('should clear all tec stacks when given an empty array', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/tec-stacks`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ tec_stack_ids: [] });

    expect(res.status).toBe(200);

    const detail = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(detail.body.data.tec_stacks.length).toBe(0);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/tec-stacks`)
      .send({ tec_stack_ids: [tecStack1Id] });
    expect(res.status).toBe(401);
  });

  it('should return 403 for reader role', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/tec-stacks`)
      .set('Cookie', ['token=' + readerToken()])
      .send({ tec_stack_ids: [tecStack1Id] });
    expect(res.status).toBe(403);
  });
});
