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

describe('Initiative Routes', () => {
  describe('GET /api/initiatives', () => {
    it('should list initiatives when authenticated', async () => {
      const res = await request(app)
        .get('/api/initiatives')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/initiatives');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/initiatives/:id', () => {
    it('should return an initiative by id', async () => {
      const res = await request(app)
        .get('/api/initiatives/1')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.initiative_name).toBe('Digital Transformation');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .get('/api/initiatives/999')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/initiatives/1');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/initiatives', () => {
    it('should create an initiative as admin', async () => {
      const res = await request(app)
        .post('/api/initiatives')
        .set('Cookie', ['token=' + adminToken()])
        .send({ initiative_name: 'Cloud Migration', initiative_description: 'Move to cloud' });
      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
    });

    it('should create an initiative as superadmin', async () => {
      const res = await request(app)
        .post('/api/initiatives')
        .set('Cookie', ['token=' + superadminToken()])
        .send({ initiative_name: 'AI Adoption' });
      expect(res.status).toBe(201);
    });

    it('should return 400 when name missing', async () => {
      const res = await request(app)
        .post('/api/initiatives')
        .set('Cookie', ['token=' + adminToken()])
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 403 for reader role', async () => {
      const res = await request(app)
        .post('/api/initiatives')
        .set('Cookie', ['token=' + readerToken()])
        .send({ initiative_name: 'Nope' });
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/initiatives/:id', () => {
    it('should update an initiative as admin', async () => {
      const res = await request(app)
        .put('/api/initiatives/1')
        .set('Cookie', ['token=' + adminToken()])
        .send({ initiative_name: 'DX Updated' });
      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Initiative updated');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .put('/api/initiatives/999')
        .set('Cookie', ['token=' + adminToken()])
        .send({ initiative_name: 'Nope' });
      expect(res.status).toBe(404);
    });

    it('should return 403 for reader role', async () => {
      const res = await request(app)
        .put('/api/initiatives/1')
        .set('Cookie', ['token=' + readerToken()])
        .send({ initiative_name: 'Nope' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/initiatives/:id', () => {
    let initId;
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/initiatives')
        .set('Cookie', ['token=' + adminToken()])
        .send({ initiative_name: 'ToDelete' });
      initId = res.body.data.id;
    });

    it('should soft delete an initiative', async () => {
      const res = await request(app)
        .delete(`/api/initiatives/${initId}`)
        .set('Cookie', ['token=' + superadminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Initiative deleted');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .delete('/api/initiatives/9999')
        .set('Cookie', ['token=' + superadminToken()]);
      expect(res.status).toBe(404);
    });

    it('should return 403 for reader role', async () => {
      const res = await request(app)
        .delete('/api/initiatives/1')
        .set('Cookie', ['token=' + readerToken()]);
      expect(res.status).toBe(403);
    });
  });
});
