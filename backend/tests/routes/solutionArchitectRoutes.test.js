const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken } = require('../helpers/testAuth');

let db, app, projectId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);

  const res = await request(app)
    .post('/api/projects')
    .set('Cookie', ['token=' + adminToken()])
    .send({ project_name: 'SA Route Project', division_id: 1 });

  projectId = res.body.data.id;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/projects/:id/solution-architects', () => {
  it('should list solution architects for a project', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/solution-architects`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/solution-architects`);

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/projects/:id/solution-architects', () => {
  it('should sync solution architects with division assignments', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/solution-architects`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ solution_architects: [
        { user_id: 1, division_id: 1 },
        { user_id: 2, division_id: 1 }
      ]});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const listRes = await request(app)
      .get(`/api/projects/${projectId}/solution-architects`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(listRes.body.data.length).toBe(2);
    expect(listRes.body.data[0].division_id).toBe(1);
  });

  it('should replace SAs when syncing', async () => {
    await request(app)
      .put(`/api/projects/${projectId}/solution-architects`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ solution_architects: [{ user_id: 3, division_id: 1 }] });

    const res = await request(app)
      .get(`/api/projects/${projectId}/solution-architects`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].user_id).toBe(3);
  });

  it('should clear SAs with empty array', async () => {
    await request(app)
      .put(`/api/projects/${projectId}/solution-architects`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ solution_architects: [] });

    const res = await request(app)
      .get(`/api/projects/${projectId}/solution-architects`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.body.data.length).toBe(0);
  });

  it('should return 400 when solution_architects is missing', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/solution-architects`)
      .set('Cookie', ['token=' + adminToken()])
      .send({});

    expect(res.status).toBe(400);
  });

  it('should return 403 when reader tries to sync', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/solution-architects`)
      .set('Cookie', ['token=' + readerToken()])
      .send({ solution_architects: [{ user_id: 1, division_id: 1 }] });

    expect(res.status).toBe(403);
  });
});

describe('Project create/update with solution_architects', () => {
  it('should assign SAs with divisions when creating a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({
        project_name: 'SA Create Project',
        solution_architects: [
          { user_id: 1, division_id: 1 },
          { user_id: 2, division_id: 1 }
        ]
      });

    expect(res.status).toBe(201);

    const saRes = await request(app)
      .get(`/api/projects/${res.body.data.id}/solution-architects`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(saRes.body.data.length).toBe(2);
    expect(saRes.body.data[0].division_id).toBe(1);
  });

  it('should update SAs when editing a project', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({
        project_name: 'SA Update Project',
        solution_architects: [{ user_id: 1, division_id: 1 }]
      });

    const pid = createRes.body.data.id;

    await request(app)
      .put(`/api/projects/${pid}`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ solution_architects: [
        { user_id: 2, division_id: 1 },
        { user_id: 3 }
      ]});

    const saRes = await request(app)
      .get(`/api/projects/${pid}/solution-architects`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(saRes.body.data.length).toBe(2);
  });

  it('should return solution_architects with division info in getById', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({
        project_name: 'SA Detail Project',
        solution_architects: [{ user_id: 1, division_id: 1 }]
      });

    const res = await request(app)
      .get(`/api/projects/${createRes.body.data.id}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.solution_architects)).toBe(true);
    expect(res.body.data.solution_architects.length).toBe(1);
    expect(res.body.data.solution_architects[0].user_name).toBeDefined();
    expect(res.body.data.solution_architects[0].division_id).toBe(1);
    expect(res.body.data.solution_architects[0].division_name).toBe('Engineering');
  });
});
