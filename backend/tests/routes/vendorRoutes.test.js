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

describe('GET /api/vendors', () => {
  it('should return empty list initially', async () => {
    const res = await request(app)
      .get('/api/vendors')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/vendors');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/vendors', () => {
  it('should create a vendor', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Cookie', ['token=' + adminToken()])
      .send({
        vendor_name: 'Test Vendor',
        vendor_email: 'test@vendor.com',
        vendor_phone: '+1-555-0100'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Cookie', ['token=' + adminToken()])
      .send({ vendor_email: 'no-name@vendor.com' });

    expect(res.status).toBe(400);
  });

  it('should return 403 for reader', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Cookie', ['token=' + readerToken()])
      .send({ vendor_name: 'Nope' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/vendors/:id', () => {
  it('should return a vendor by id', async () => {
    const res = await request(app)
      .get('/api/vendors/1')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data.vendor_name).toBe('Test Vendor');
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .get('/api/vendors/99999')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/vendors/:id', () => {
  it('should update a vendor', async () => {
    const res = await request(app)
      .put('/api/vendors/1')
      .set('Cookie', ['token=' + adminToken()])
      .send({ vendor_name: 'Updated Vendor' });

    expect(res.status).toBe(200);
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .put('/api/vendors/99999')
      .set('Cookie', ['token=' + adminToken()])
      .send({ vendor_name: 'Nope' });

    expect(res.status).toBe(404);
  });

  it('should return 403 for reader', async () => {
    const res = await request(app)
      .put('/api/vendors/1')
      .set('Cookie', ['token=' + readerToken()])
      .send({ vendor_name: 'Nope' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/vendors/:id', () => {
  let vendorId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Cookie', ['token=' + adminToken()])
      .send({ vendor_name: 'To Delete' });
    vendorId = res.body.data.id;
  });

  it('should soft delete a vendor', async () => {
    const res = await request(app)
      .delete(`/api/vendors/${vendorId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .delete('/api/vendors/99999')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(404);
  });

  it('should return 403 for reader', async () => {
    const res = await request(app)
      .delete('/api/vendors/1')
      .set('Cookie', ['token=' + readerToken()]);

    expect(res.status).toBe(403);
  });
});
