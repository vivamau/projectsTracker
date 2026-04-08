const supertest = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { superadminToken, adminToken } = require('../helpers/testAuth');

let db, app, request;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);
  request = supertest(app);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/seniorities', () => {
  it('returns list of seniorities when authenticated', async () => {
    const res = await request
      .get('/api/seniorities')
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request.get('/api/seniorities');

    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/seniorities', () => {
  it('creates a seniority when authenticated as superadmin', async () => {
    const res = await request
      .post('/api/seniorities')
      .set('Cookie', [`token=${superadminToken()}`])
      .send({
        seniority_description: 'Expert Consultant'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeGreaterThan(0);
  });

  it('rejects admin role', async () => {
    const res = await request
      .post('/api/seniorities')
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        seniority_description: 'Should Fail'
      });

    expect(res.statusCode).toBe(403);
  });

  it('returns 400 when seniority_description missing', async () => {
    const res = await request
      .post('/api/seniorities')
      .set('Cookie', [`token=${superadminToken()}`])
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request
      .post('/api/seniorities')
      .send({
        seniority_description: 'Expert'
      });

    expect(res.statusCode).toBe(401);
  });
});

describe('DELETE /api/seniorities/:id', () => {
  it('soft-deletes a seniority when authenticated as superadmin', async () => {
    const createRes = await request
      .post('/api/seniorities')
      .set('Cookie', [`token=${superadminToken()}`])
      .send({
        seniority_description: 'To Delete'
      });
    const seniorityId = createRes.body.data.id;

    const res = await request
      .delete(`/api/seniorities/${seniorityId}`)
      .set('Cookie', [`token=${superadminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects admin role', async () => {
    const createRes = await request
      .post('/api/seniorities')
      .set('Cookie', [`token=${superadminToken()}`])
      .send({
        seniority_description: 'Admin Cannot Delete'
      });
    const seniorityId = createRes.body.data.id;

    const res = await request
      .delete(`/api/seniorities/${seniorityId}`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(403);
  });

  it('returns 404 when seniority not found', async () => {
    const res = await request
      .delete('/api/seniorities/99999')
      .set('Cookie', [`token=${superadminToken()}`]);

    expect(res.statusCode).toBe(404);
  });
});
