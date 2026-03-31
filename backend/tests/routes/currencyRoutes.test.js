const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken } = require('../helpers/testAuth');
const { runQuery } = require('../../config/database');

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

describe('GET /api/currencies', () => {
  beforeAll(async () => {
    // Create test currencies
    await runQuery(db, "INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)", ['USD', Date.now()]);
    await runQuery(db, "INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)", ['EUR', Date.now()]);
  });

  it('should return all currencies when authenticated', async () => {
    const res = await request(app)
      .get('/api/currencies')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should require authentication', async () => {
    const res = await request(app).get('/api/currencies');
    expect(res.status).toBe(401);
  });

  it('should include currency names in response', async () => {
    const res = await request(app)
      .get('/api/currencies')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    const currencyNames = res.body.data.map(c => c.currency_name);
    expect(currencyNames).toContain('USD');
    expect(currencyNames).toContain('EUR');
  });
});

describe('POST /api/currencies', () => {
  it('should create a currency with admin role', async () => {
    const res = await request(app)
      .post('/api/currencies')
      .set('Cookie', ['token=' + adminToken()])
      .send({ currency_name: 'GBP' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.id).toBeGreaterThan(0);
  });

  it('should fail without currency_name', async () => {
    const res = await request(app)
      .post('/api/currencies')
      .set('Cookie', ['token=' + adminToken()])
      .send({});

    expect(res.status).toBe(400);
  });

  it('should fail with reader role (not admin)', async () => {
    const res = await request(app)
      .post('/api/currencies')
      .set('Cookie', ['token=' + readerToken()])
      .send({ currency_name: 'JPY' });

    expect(res.status).toBe(403);
  });

  it('should require authentication', async () => {
    const res = await request(app)
      .post('/api/currencies')
      .send({ currency_name: 'INR' });

    expect(res.status).toBe(401);
  });

  it('should fail with empty currency_name', async () => {
    const res = await request(app)
      .post('/api/currencies')
      .set('Cookie', ['token=' + adminToken()])
      .send({ currency_name: '' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/currencies/:id', () => {
  let currencyId;

  beforeAll(async () => {
    const result = await runQuery(db, "INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)", ['CHF', Date.now()]);
    currencyId = result.lastID;
  });

  it('should delete a currency with admin role', async () => {
    const res = await request(app)
      .delete(`/api/currencies/${currencyId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('deleted');
  });

  it('should return 404 for non-existent currency', async () => {
    const res = await request(app)
      .delete('/api/currencies/99999')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(404);
  });

  it('should fail with reader role (not admin)', async () => {
    const result = await runQuery(db, "INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)", ['CAD', Date.now()]);
    const newCurrencyId = result.lastID;

    const res = await request(app)
      .delete(`/api/currencies/${newCurrencyId}`)
      .set('Cookie', ['token=' + readerToken()]);

    expect(res.status).toBe(403);
  });

  it('should require authentication', async () => {
    const res = await request(app).delete(`/api/currencies/${currencyId}`);
    expect(res.status).toBe(401);
  });

  it('should not delete already deleted currency', async () => {
    const result = await runQuery(db, "INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)", ['MXN', Date.now()]);
    const testCurrencyId = result.lastID;

    // First delete
    const res1 = await request(app)
      .delete(`/api/currencies/${testCurrencyId}`)
      .set('Cookie', ['token=' + adminToken()]);
    expect(res1.status).toBe(200);

    // Try to delete again
    const res2 = await request(app)
      .delete(`/api/currencies/${testCurrencyId}`)
      .set('Cookie', ['token=' + adminToken()]);
    expect(res2.status).toBe(404);
  });
});
