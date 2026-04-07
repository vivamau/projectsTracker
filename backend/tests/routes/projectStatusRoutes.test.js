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

describe('GET /api/project-statuses', () => {
  it('should list project statuses when authenticated', async () => {
    const res = await request(app)
      .get('/api/project-statuses')
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/project-statuses');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/project-statuses', () => {
  it('should create a project status as superadmin', async () => {
    const res = await request(app)
      .post('/api/project-statuses')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ project_status_name: 'Pilot', project_status_description: 'Pilot phase' });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });

  it('should return 400 when project_status_name is missing', async () => {
    const res = await request(app)
      .post('/api/project-statuses')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ project_status_description: 'No name' });
    expect(res.status).toBe(400);
  });

  it('should return 403 for admin role', async () => {
    const res = await request(app)
      .post('/api/project-statuses')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_status_name: 'Should Fail' });
    expect(res.status).toBe(403);
  });

  it('should return 403 for reader role', async () => {
    const res = await request(app)
      .post('/api/project-statuses')
      .set('Cookie', ['token=' + readerToken()])
      .send({ project_status_name: 'Should Fail' });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/project-statuses/:id', () => {
  let statusId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/project-statuses')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ project_status_name: 'Edit Me' });
    statusId = res.body.data.id;
  });

  it('should update a project status as superadmin', async () => {
    const res = await request(app)
      .put(`/api/project-statuses/${statusId}`)
      .set('Cookie', ['token=' + superadminToken()])
      .send({ project_status_name: 'Edited', project_status_description: 'Updated desc' });
    expect(res.status).toBe(200);
  });

  it('should return 404 for non-existent status', async () => {
    const res = await request(app)
      .put('/api/project-statuses/99999')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ project_status_name: 'Nope' });
    expect(res.status).toBe(404);
  });

  it('should return 403 for admin role', async () => {
    const res = await request(app)
      .put(`/api/project-statuses/${statusId}`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_status_name: 'Nope' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/project-statuses/:id', () => {
  let statusId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/project-statuses')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ project_status_name: 'Delete Me' });
    statusId = res.body.data.id;
  });

  it('should soft delete a project status as superadmin', async () => {
    const res = await request(app)
      .delete(`/api/project-statuses/${statusId}`)
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(200);
  });

  it('should not return deleted status in GET', async () => {
    const res = await request(app)
      .get('/api/project-statuses')
      .set('Cookie', ['token=' + superadminToken()]);
    const ids = res.body.data.map(s => s.id);
    expect(ids).not.toContain(statusId);
  });

  it('should return 404 for non-existent status', async () => {
    const res = await request(app)
      .delete('/api/project-statuses/99999')
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(404);
  });

  it('should return 403 for admin role', async () => {
    const res = await request(app)
      .delete('/api/project-statuses/1')
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(403);
  });
});
