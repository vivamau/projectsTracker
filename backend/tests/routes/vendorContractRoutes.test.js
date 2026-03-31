const supertest = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken } = require('../helpers/testAuth');

let db, app, request;
let vendorId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);
  request = supertest(app);

  // Create vendor via HTTP
  const vendorRes = await request
    .post('/api/vendors')
    .set('Cookie', [`token=${adminToken()}`])
    .send({
      vendor_name: 'Test Vendor',
      vendor_email: 'vendor@test.com'
    });
  vendorId = vendorRes.body.data.id;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/vendors/:vendorId/contracts', () => {
  it('returns empty array initially (authenticated)', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts`);

    expect(res.statusCode).toBe(401);
  });

  it('returns contracts list after creation', async () => {
    const startDate = Date.now();

    // Create contract
    await request
      .post(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_name: 'Test Contract',
        contract_start_date: startDate
      });

    // Get list
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const contract = res.body.data[0];
    expect(contract.contract_name).toBe('Test Contract');
    expect(contract.vendor_id).toBe(vendorId);
  });
});

describe('GET /api/vendors/:vendorId/contracts/:contractId', () => {
  let testContractId;

  beforeAll(async () => {
    // Create a contract for testing
    const contractRes = await request
      .post(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_name: 'Fetch Test Contract',
        contract_start_date: Date.now()
      });
    testContractId = contractRes.body.data.id;
  });

  it('returns a contract by id (authenticated)', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${testContractId}`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(testContractId);
    expect(res.body.data.contract_name).toBe('Fetch Test Contract');
  });

  it('returns 404 for non-existent contract', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/99999`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${testContractId}`);

    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/vendors/:vendorId/contracts', () => {
  it('creates a contract with required fields (201)', async () => {
    const startDate = Date.now();

    const res = await request
      .post(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_name: 'New Contract',
        contract_start_date: startDate
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
  });

  it('creates a contract with all fields', async () => {
    const startDate = Date.now();
    const endDate = startDate + 86400000 * 365;

    const res = await request
      .post(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_name: 'Full Contract',
        contract_document_path: '/documents/contract.pdf',
        contract_start_date: startDate,
        contract_end_date: endDate
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
  });

  it('returns 400 when contract_name is missing', async () => {
    const res = await request
      .post(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_start_date: Date.now()
      });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when contract_start_date is missing', async () => {
    const res = await request
      .post(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_name: 'No Date Contract'
      });

    expect(res.statusCode).toBe(400);
  });

  it('returns 403 for reader role', async () => {
    const res = await request
      .post(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${readerToken()}`])
      .send({
        contract_name: 'Contract',
        contract_start_date: Date.now()
      });

    expect(res.statusCode).toBe(403);
  });
});

describe('PUT /api/vendors/:vendorId/contracts/:contractId', () => {
  let testContractId;

  beforeAll(async () => {
    // Create a contract for testing
    const contractRes = await request
      .post(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_name: 'Update Test Contract',
        contract_start_date: Date.now()
      });
    testContractId = contractRes.body.data.id;
  });

  it('updates contract name (200)', async () => {
    const res = await request
      .put(`/api/vendors/${vendorId}/contracts/${testContractId}`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_name: 'Updated Name'
      });

    expect(res.statusCode).toBe(200);
  });

  it('updates document path (200)', async () => {
    const res = await request
      .put(`/api/vendors/${vendorId}/contracts/${testContractId}`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_document_path: '/new/path.pdf'
      });

    expect(res.statusCode).toBe(200);
  });

  it('updates dates (200)', async () => {
    const newStart = Date.now() + 1000;
    const newEnd = Date.now() + 86400000;

    const res = await request
      .put(`/api/vendors/${vendorId}/contracts/${testContractId}`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_start_date: newStart,
        contract_end_date: newEnd
      });

    expect(res.statusCode).toBe(200);
  });

  it('returns 404 for non-existent contract', async () => {
    const res = await request
      .put(`/api/vendors/${vendorId}/contracts/99999`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_name: 'Updated'
      });

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 for reader role', async () => {
    const res = await request
      .put(`/api/vendors/${vendorId}/contracts/${testContractId}`)
      .set('Cookie', [`token=${readerToken()}`])
      .send({
        contract_name: 'Updated'
      });

    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /api/vendors/:vendorId/contracts/:contractId', () => {
  let testContractId;

  beforeAll(async () => {
    // Create a contract for testing
    const contractRes = await request
      .post(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_name: 'Delete Test Contract',
        contract_start_date: Date.now()
      });
    testContractId = contractRes.body.data.id;
  });

  it('soft deletes a contract (200)', async () => {
    const res = await request
      .delete(`/api/vendors/${vendorId}/contracts/${testContractId}`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
  });

  it('deleted contract is absent from GET list', async () => {
    // Contract was deleted in previous test
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    const found = res.body.data.find(c => c.id === testContractId);
    expect(found).toBeUndefined();
  });

  it('returns 404 for non-existent contract', async () => {
    const res = await request
      .delete(`/api/vendors/${vendorId}/contracts/99999`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 for reader role', async () => {
    // Create another contract to delete
    const contractRes = await request
      .post(`/api/vendors/${vendorId}/contracts`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        contract_name: 'For reader delete test',
        contract_start_date: Date.now()
      });

    const res = await request
      .delete(`/api/vendors/${vendorId}/contracts/${contractRes.body.data.id}`)
      .set('Cookie', [`token=${readerToken()}`]);

    expect(res.statusCode).toBe(403);
  });
});
