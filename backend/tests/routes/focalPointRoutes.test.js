const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken } = require('../helpers/testAuth');

let db, app;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/divisions/:id/focal-points', () => {
  it('should return focal points for a division', async () => {
    const res = await request(app)
      .get('/api/divisions/1/focal-points')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get('/api/divisions/1/focal-points');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/divisions/:id/focal-points', () => {
  it('should add a focal point', async () => {
    const res = await request(app)
      .post('/api/divisions/1/focal-points')
      .set('Cookie', ['token=' + adminToken()])
      .send({ user_id: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });

  it('should return 400 when user_id is missing', async () => {
    const res = await request(app)
      .post('/api/divisions/1/focal-points')
      .set('Cookie', ['token=' + adminToken()])
      .send({});

    expect(res.status).toBe(400);
  });

  it('should return 403 for reader', async () => {
    const res = await request(app)
      .post('/api/divisions/1/focal-points')
      .set('Cookie', ['token=' + readerToken()])
      .send({ user_id: 1 });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/divisions/:id/focal-points/:fpId', () => {
  it('should remove a focal point', async () => {
    // First add one
    const addRes = await request(app)
      .post('/api/divisions/1/focal-points')
      .set('Cookie', ['token=' + adminToken()])
      .send({ user_id: 2 });

    const fpId = addRes.body.data.id;

    const res = await request(app)
      .delete(`/api/divisions/1/focal-points/${fpId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
  });

  it('should return 404 for non-existent focal point', async () => {
    const res = await request(app)
      .delete('/api/divisions/1/focal-points/99999')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(404);
  });

  it('should return 403 for reader', async () => {
    const res = await request(app)
      .delete('/api/divisions/1/focal-points/1')
      .set('Cookie', ['token=' + readerToken()]);

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/divisions/:id/focal-points', () => {
  it('should sync focal points', async () => {
    const res = await request(app)
      .put('/api/divisions/1/focal-points')
      .set('Cookie', ['token=' + adminToken()])
      .send({ user_ids: [1, 2] });

    expect(res.status).toBe(200);

    const listRes = await request(app)
      .get('/api/divisions/1/focal-points')
      .set('Cookie', ['token=' + adminToken()]);

    expect(listRes.body.data.length).toBe(2);
  });

  it('should return 400 when user_ids is not an array', async () => {
    const res = await request(app)
      .put('/api/divisions/1/focal-points')
      .set('Cookie', ['token=' + adminToken()])
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /api/divisions/:id/projects', () => {
  beforeAll(async () => {
    // Create a project in division 1
    await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_name: 'Division Project 1', division_id: 1 });
  });

  it('should return projects for a division', async () => {
    const res = await request(app)
      .get('/api/divisions/1/projects')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].project_name).toBeDefined();
  });

  it('should return empty array for division with no projects', async () => {
    // Create a new division with no projects
    const divRes = await request(app)
      .post('/api/divisions')
      .set('Cookie', ['token=' + adminToken()])
      .send({ division_name: 'Empty Division' });

    const res = await request(app)
      .get(`/api/divisions/${divRes.body.data.id}/projects`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /api/divisions/:id/project-managers', () => {
  beforeAll(async () => {
    // Create a project with a PM assigned to division 1
    await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({
        project_name: 'PM Division Project',
        division_id: 1,
        project_managers: [{ user_id: 1, division_id: 1 }]
      });
  });

  it('should return project managers for a division', async () => {
    const res = await request(app)
      .get('/api/divisions/1/project-managers')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].user_name).toBeDefined();
    expect(res.body.data[0].project_name).toBeDefined();
  });

  it('should return empty array for division with no PMs', async () => {
    const divRes = await request(app)
      .post('/api/divisions')
      .set('Cookie', ['token=' + adminToken()])
      .send({ division_name: 'No PM Division' });

    const res = await request(app)
      .get(`/api/divisions/${divRes.body.data.id}/project-managers`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /api/divisions/:id (detail)', () => {
  it('should return division with focal points count and project count', async () => {
    const res = await request(app)
      .get('/api/divisions/1')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data.division_name).toBe('Engineering');
    expect(res.body.data.focal_points_count).toBeDefined();
    expect(res.body.data.projects_count).toBeDefined();
    expect(res.body.data.total_budget).toBeDefined();
  });
});
