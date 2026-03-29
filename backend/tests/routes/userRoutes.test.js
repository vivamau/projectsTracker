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

describe('User Routes', () => {
  describe('GET /api/users', () => {
    it('should list users as admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(4);
    });

    it('should list users as superadmin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Cookie', ['token=' + superadminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support pagination parameters', async () => {
      const res = await request(app)
        .get('/api/users?page=1&limit=2')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
    });

    it('should support search parameter', async () => {
      const res = await request(app)
        .get('/api/users?search=admin')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
    });

    it('should return 403 for reader role', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Cookie', ['token=' + readerToken()]);
      expect(res.status).toBe(403);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a user by id as admin', async () => {
      const res = await request(app)
        .get('/api/users/1')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user_email).toBe('superadmin@test.com');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/users/999')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(404);
    });

    it('should return 403 for reader role', async () => {
      const res = await request(app)
        .get('/api/users/1')
        .set('Cookie', ['token=' + readerToken()]);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/users', () => {
    it('should create a user as superadmin', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Cookie', ['token=' + superadminToken()])
        .send({
          user_email: 'newuser@test.com',
          password: 'password123',
          userrole_id: 3,
          user_name: 'New',
          user_lastname: 'User'
        });
      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
    });

    it('should return 400 when required fields missing', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Cookie', ['token=' + superadminToken()])
        .send({ user_email: 'incomplete@test.com' });
      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate email', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Cookie', ['token=' + superadminToken()])
        .send({
          user_email: 'newuser@test.com',
          password: 'password123',
          userrole_id: 3
        });
      expect(res.status).toBe(409);
    });

    it('should return 403 for admin role', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Cookie', ['token=' + adminToken()])
        .send({
          user_email: 'another@test.com',
          password: 'password123',
          userrole_id: 3
        });
      expect(res.status).toBe(403);
    });

    it('should return 403 for reader role', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Cookie', ['token=' + readerToken()])
        .send({
          user_email: 'another@test.com',
          password: 'password123',
          userrole_id: 3
        });
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update a user as superadmin', async () => {
      const res = await request(app)
        .put('/api/users/2')
        .set('Cookie', ['token=' + superadminToken()])
        .send({ user_name: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('User updated');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .put('/api/users/999')
        .set('Cookie', ['token=' + superadminToken()])
        .send({ user_name: 'Nope' });
      expect(res.status).toBe(404);
    });

    it('should return 403 for admin role', async () => {
      const res = await request(app)
        .put('/api/users/2')
        .set('Cookie', ['token=' + adminToken()])
        .send({ user_name: 'Nope' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/users/:id', () => {
    let userId;
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Cookie', ['token=' + superadminToken()])
        .send({
          user_email: 'todelete@test.com',
          password: 'password123',
          userrole_id: 4
        });
      userId = res.body.data.id;
    });

    it('should soft delete a user as superadmin', async () => {
      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Cookie', ['token=' + superadminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('User deleted');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .delete('/api/users/9999')
        .set('Cookie', ['token=' + superadminToken()]);
      expect(res.status).toBe(404);
    });

    it('should return 403 for admin role', async () => {
      const res = await request(app)
        .delete('/api/users/3')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(403);
    });
  });
});
