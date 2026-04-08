const supertest = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, superadminToken } = require('../helpers/testAuth');

let db, app, request;
let vendorId, contractId, roleId, currencyId, seniorityId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);
  request = supertest(app);

  // Create vendor
  const vendorRes = await request
    .post('/api/vendors')
    .set('Cookie', [`token=${adminToken()}`])
    .send({
      vendor_name: 'Test Vendor',
      vendor_email: 'vendor@test.com'
    });
  vendorId = vendorRes.body.data.id;

  // Create contract
  const contractRes = await request
    .post(`/api/vendors/${vendorId}/contracts`)
    .set('Cookie', [`token=${adminToken()}`])
    .send({
      contract_name: 'Test Contract',
      contract_start_date: Date.now()
    });
  contractId = contractRes.body.data.id;

  // Create role
  const roleRes = await request
    .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
    .set('Cookie', [`token=${adminToken()}`])
    .send({
      vendorcontractrole_name: 'Test Role'
    });
  roleId = roleRes.body.data.id;

  // Create currency
  const currRes = await request
    .post('/api/currencies')
    .set('Cookie', [`token=${adminToken()}`])
    .send({
      currency_name: 'USD',
      currency_code: 'USD',
      currency_symbol: '$'
    });
  currencyId = currRes.body.data.id;

  // Create seniority (superadmin only)
  const senRes = await request
    .post('/api/seniorities')
    .set('Cookie', [`token=${superadminToken()}`])
    .send({
      seniority_description: 'Senior'
    });
  seniorityId = senRes.body.data.id;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/vendors/:vendorId/contracts/:contractId/roles/:roleId/rates', () => {
  it('returns empty array initially', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns rates with currency and seniority info', async () => {
    await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorrolerate_rate: 175,
        currency_id: currencyId,
        seniority_id: seniorityId
      });

    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const rate = res.body.data[0];
    expect(rate.currency_name).toBe('USD');
    expect(rate.seniority_description).toBe('Senior');
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`);

    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/vendors/:vendorId/contracts/:contractId/roles/:roleId/rates/:rateId', () => {
  it('returns a rate by id', async () => {
    const createRes = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorrolerate_rate: 180,
        currency_id: currencyId,
        seniority_id: seniorityId,
        vendorrolerate_description: 'Test description'
      });
    const rateId = createRes.body.data.id;

    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates/${rateId}`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.vendorrolerate_rate).toBe(180);
    expect(res.body.data.currency_name).toBe('USD');
  });

  it('returns 404 for non-existent rate', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates/99999`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/vendors/:vendorId/contracts/:contractId/roles/:roleId/rates', () => {
  it('creates a rate with required fields', async () => {
    const res = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorrolerate_rate: 200,
        currency_id: currencyId
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
  });

  it('creates a rate with seniority and description', async () => {
    const res = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorrolerate_rate: 220,
        currency_id: currencyId,
        seniority_id: seniorityId,
        vendorrolerate_description: 'Senior consultant rate'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
  });

  it('returns 400 when vendorrolerate_rate missing', async () => {
    const res = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        currency_id: currencyId
      });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when currency_id missing', async () => {
    const res = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorrolerate_rate: 150
      });

    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`)
      .send({
        vendorrolerate_rate: 200,
        currency_id: currencyId
      });

    expect(res.statusCode).toBe(401);
  });
});

describe('PUT /api/vendors/:vendorId/contracts/:contractId/roles/:roleId/rates/:rateId', () => {
  it('updates rate amount', async () => {
    const createRes = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorrolerate_rate: 100,
        currency_id: currencyId
      });
    const rateId = createRes.body.data.id;

    const res = await request
      .put(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates/${rateId}`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorrolerate_rate: 250
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('updates seniority and description', async () => {
    const createRes = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorrolerate_rate: 100,
        currency_id: currencyId
      });
    const rateId = createRes.body.data.id;

    const res = await request
      .put(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates/${rateId}`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        seniority_id: seniorityId,
        vendorrolerate_description: 'Updated description'
      });

    expect(res.statusCode).toBe(200);
  });

  it('returns 404 for non-existent rate', async () => {
    const res = await request
      .put(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates/99999`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorrolerate_rate: 100
      });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/vendors/:vendorId/contracts/:contractId/roles/:roleId/rates/:rateId', () => {
  it('soft-deletes a rate', async () => {
    const createRes = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorrolerate_rate: 100,
        currency_id: currencyId
      });
    const rateId = createRes.body.data.id;

    const res = await request
      .delete(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates/${rateId}`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for non-existent rate', async () => {
    const res = await request
      .delete(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates/99999`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(404);
  });
});
