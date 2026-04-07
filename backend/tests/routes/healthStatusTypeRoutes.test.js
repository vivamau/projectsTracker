const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { superadminToken, adminToken, readerToken } = require('../helpers/testAuth');

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

describe('GET /api/healthstatus-types', () => {
  it('should list health status types when authenticated', async () => {
    const res = await request(app)
      .get('/api/healthstatus-types')
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/healthstatus-types');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/healthstatus-types', () => {
  it('should create a health status type as superadmin', async () => {
    const res = await request(app)
      .post('/api/healthstatus-types')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ healthstatus_name: 'At Risk', healthstatus_description: 'Project is at risk' });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });

  it('should return 400 when healthstatus_name is missing', async () => {
    const res = await request(app)
      .post('/api/healthstatus-types')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ healthstatus_description: 'No name' });
    expect(res.status).toBe(400);
  });

  it('should return 403 for admin role', async () => {
    const res = await request(app)
      .post('/api/healthstatus-types')
      .set('Cookie', ['token=' + adminToken()])
      .send({ healthstatus_name: 'Should Fail' });
    expect(res.status).toBe(403);
  });

  it('should return 403 for reader role', async () => {
    const res = await request(app)
      .post('/api/healthstatus-types')
      .set('Cookie', ['token=' + readerToken()])
      .send({ healthstatus_name: 'Should Fail' });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/healthstatus-types/:id', () => {
  let typeId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/healthstatus-types')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ healthstatus_name: 'Edit Me' });
    typeId = res.body.data.id;
  });

  it('should update a health status type as superadmin', async () => {
    const res = await request(app)
      .put(`/api/healthstatus-types/${typeId}`)
      .set('Cookie', ['token=' + superadminToken()])
      .send({ healthstatus_name: 'Edited', healthstatus_description: 'Updated desc' });
    expect(res.status).toBe(200);
  });

  it('should return 404 for non-existent type', async () => {
    const res = await request(app)
      .put('/api/healthstatus-types/99999')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ healthstatus_name: 'Nope' });
    expect(res.status).toBe(404);
  });

  it('should return 403 for admin role', async () => {
    const res = await request(app)
      .put(`/api/healthstatus-types/${typeId}`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ healthstatus_name: 'Nope' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/healthstatus-types/:id', () => {
  let typeId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/healthstatus-types')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ healthstatus_name: 'Delete Me' });
    typeId = res.body.data.id;
  });

  it('should soft delete a health status type as superadmin', async () => {
    const res = await request(app)
      .delete(`/api/healthstatus-types/${typeId}`)
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(200);
  });

  it('should not return deleted type in GET', async () => {
    const res = await request(app)
      .get('/api/healthstatus-types')
      .set('Cookie', ['token=' + superadminToken()]);
    const ids = res.body.data.map(t => t.id);
    expect(ids).not.toContain(typeId);
  });

  it('should return 404 for non-existent type', async () => {
    const res = await request(app)
      .delete('/api/healthstatus-types/99999')
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(404);
  });

  it('should return 403 for admin role', async () => {
    const res = await request(app)
      .delete(`/api/healthstatus-types/${typeId}`)
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(403);
  });
});
