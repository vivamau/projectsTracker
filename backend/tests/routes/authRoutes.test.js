const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { superadminToken, adminToken, readerToken, guestToken } = require('../helpers/testAuth');

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

describe('POST /api/auth/login', () => {
  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'superadmin@test.com', password: 'testpassword' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.user_email).toBe('superadmin@test.com');
    expect(res.body.data.user.user_password_hash).toBeUndefined();

    // Should set httpOnly cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=/);
    expect(cookies[0]).toMatch(/HttpOnly/i);
  });

  it('should return 401 for invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'testpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('should return 401 for invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'superadmin@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('should return 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'testpassword' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'superadmin@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when both fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/logout', () => {
  it('should clear the token cookie on logout', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', ['token=' + superadminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    // Cookie should be cleared (expires in the past or max-age=0)
    expect(cookies[0]).toMatch(/token=/);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('should return user info when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['token=' + superadminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.user_email).toBe('superadmin@test.com');
    expect(res.body.data.user.role).toBe('superadmin');
  });

  it('should return user info for admin', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data.user.user_email).toBe('admin@test.com');
    expect(res.body.data.user.role).toBe('admin');
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('should return 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['token=invalid-jwt-token']);

    expect(res.status).toBe(401);
  });
});
