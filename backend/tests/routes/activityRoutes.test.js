const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken } = require('../helpers/testAuth');

let db, app, projectId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);

  const res = await request(app)
    .post('/api/projects')
    .set('Cookie', ['token=' + adminToken()])
    .send({ project_name: 'Activity Test Project', division_id: 1 });
  projectId = res.body.data.id;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/projects/:projectId/activities', () => {
  it('should return empty array when no activities exist', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/activities`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/activities`);

    expect(res.status).toBe(401);
  });
});
