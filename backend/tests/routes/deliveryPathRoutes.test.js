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

describe('Delivery Path Routes', () => {
  describe('GET /api/deliverypaths', () => {
    it('should list delivery paths when authenticated', async () => {
      const res = await request(app)
        .get('/api/deliverypaths')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/deliverypaths');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/deliverypaths/:id', () => {
    it('should return a delivery path by id', async () => {
      const res = await request(app)
        .get('/api/deliverypaths/1')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deliverypath_name).toBe('Agile');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .get('/api/deliverypaths/999')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/deliverypaths/1');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/deliverypaths', () => {
    it('should create a delivery path as admin', async () => {
      const res = await request(app)
        .post('/api/deliverypaths')
        .set('Cookie', ['token=' + adminToken()])
        .send({ deliverypath_name: 'Waterfall', deilverypath_description: 'Traditional approach' });
      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
    });

    it('should create a delivery path as superadmin', async () => {
      const res = await request(app)
        .post('/api/deliverypaths')
        .set('Cookie', ['token=' + superadminToken()])
        .send({ deliverypath_name: 'Kanban' });
      expect(res.status).toBe(201);
    });

    it('should return 400 when name missing', async () => {
      const res = await request(app)
        .post('/api/deliverypaths')
        .set('Cookie', ['token=' + adminToken()])
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 403 for reader role', async () => {
      const res = await request(app)
        .post('/api/deliverypaths')
        .set('Cookie', ['token=' + readerToken()])
        .send({ deliverypath_name: 'Lean' });
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/deliverypaths/:id', () => {
    it('should update a delivery path as admin', async () => {
      const res = await request(app)
        .put('/api/deliverypaths/1')
        .set('Cookie', ['token=' + adminToken()])
        .send({ deliverypath_name: 'Agile Updated' });
      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Delivery path updated');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .put('/api/deliverypaths/999')
        .set('Cookie', ['token=' + adminToken()])
        .send({ deliverypath_name: 'Nope' });
      expect(res.status).toBe(404);
    });

    it('should return 403 for reader role', async () => {
      const res = await request(app)
        .put('/api/deliverypaths/1')
        .set('Cookie', ['token=' + readerToken()])
        .send({ deliverypath_name: 'Nope' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/deliverypaths/:id', () => {
    let dpId;
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/deliverypaths')
        .set('Cookie', ['token=' + adminToken()])
        .send({ deliverypath_name: 'ToDelete' });
      dpId = res.body.data.id;
    });

    it('should soft delete a delivery path', async () => {
      const res = await request(app)
        .delete(`/api/deliverypaths/${dpId}`)
        .set('Cookie', ['token=' + superadminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Delivery path deleted');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .delete('/api/deliverypaths/9999')
        .set('Cookie', ['token=' + superadminToken()]);
      expect(res.status).toBe(404);
    });

    it('should return 403 for reader role', async () => {
      const res = await request(app)
        .delete('/api/deliverypaths/1')
        .set('Cookie', ['token=' + readerToken()]);
      expect(res.status).toBe(403);
    });
  });
});
