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

describe('Division Routes', () => {
  describe('GET /api/divisions', () => {
    it('should list divisions when authenticated', async () => {
      const res = await request(app)
        .get('/api/divisions')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/divisions');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/divisions', () => {
    it('should create division as admin', async () => {
      const res = await request(app)
        .post('/api/divisions')
        .set('Cookie', ['token=' + adminToken()])
        .send({ division_name: 'Marketing' });
      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
    });

    it('should return 400 when name missing', async () => {
      const res = await request(app)
        .post('/api/divisions')
        .set('Cookie', ['token=' + adminToken()])
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 403 for reader', async () => {
      const res = await request(app)
        .post('/api/divisions')
        .set('Cookie', ['token=' + readerToken()])
        .send({ division_name: 'Finance' });
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/divisions/:id', () => {
    it('should update division as admin', async () => {
      const res = await request(app)
        .put('/api/divisions/1')
        .set('Cookie', ['token=' + adminToken()])
        .send({ division_name: 'Engineering Updated' });
      expect(res.status).toBe(200);
    });

    it('should return 404 for nonexistent', async () => {
      const res = await request(app)
        .put('/api/divisions/999')
        .set('Cookie', ['token=' + adminToken()])
        .send({ division_name: 'Nope' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/divisions/:id', () => {
    let divId;
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/divisions')
        .set('Cookie', ['token=' + adminToken()])
        .send({ division_name: 'ToDelete' });
      divId = res.body.data.id;
    });

    it('should soft delete division', async () => {
      const res = await request(app)
        .delete(`/api/divisions/${divId}`)
        .set('Cookie', ['token=' + superadminToken()]);
      expect(res.status).toBe(200);
    });

    it('should return 404 for already deleted', async () => {
      const res = await request(app)
        .delete(`/api/divisions/${divId}`)
        .set('Cookie', ['token=' + superadminToken()]);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/divisions/:id/supporting-projects', () => {
    it('should return empty list when no supporting projects', async () => {
      const res = await request(app)
        .get('/api/divisions/1/supporting-projects')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return supporting projects when division participates', async () => {
      // First, create a project with a supporting division
      const projRes = await request(app)
        .post('/api/projects')
        .set('Cookie', ['token=' + adminToken()])
        .send({
          project_name: 'Project with Supporting Div',
          division_id: 1,
          user_id: 1,
          initiative_id: 1,
          deliverypath_id: 1,
          supporting_division_ids: [2]
        });
      expect(projRes.status).toBe(201);

      // Now fetch supporting projects for division 2
      const res = await request(app)
        .get('/api/divisions/2/supporting-projects')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].project_name).toBe('Project with Supporting Div');
    });
  });
});
