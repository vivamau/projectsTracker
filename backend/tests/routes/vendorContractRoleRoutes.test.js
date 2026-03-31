const supertest = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken } = require('../helpers/testAuth');

let db, app, request;
let vendorId, contractId;

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
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/vendors/:vendorId/contracts/:contractId/roles', () => {
  it('returns empty array initially (authenticated)', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${contractId}/roles`);

    expect(res.statusCode).toBe(401);
  });

  it('returns roles list after creation', async () => {
    // Create role
    await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorcontractrole_name: 'Consultant'
      });

    // Get list
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const role = res.body.data[0];
    expect(role.vendorcontractrole_name).toBe('Consultant');
    expect(role.vendorcontract_id).toBe(contractId);
  });
});

describe('GET /api/vendors/:vendorId/contracts/:contractId/roles/:roleId', () => {
  let testRoleId;

  beforeAll(async () => {
    // Create a role for testing
    const roleRes = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorcontractrole_name: 'Fetch Test Role'
      });
    testRoleId = roleRes.body.data.id;
  });

  it('returns a role by id (authenticated)', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${testRoleId}`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(testRoleId);
    expect(res.body.data.vendorcontractrole_name).toBe('Fetch Test Role');
  });

  it('returns 404 for non-existent role', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${contractId}/roles/99999`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${testRoleId}`);

    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/vendors/:vendorId/contracts/:contractId/roles', () => {
  it('creates a role with required fields (201)', async () => {
    const res = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorcontractrole_name: 'New Role'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
  });

  it('creates a role with description', async () => {
    const res = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorcontractrole_name: 'Senior Consultant',
        vendorcontractrole_description: 'Leads technical projects'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
  });

  it('returns 400 when vendorcontractrole_name is missing', async () => {
    const res = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorcontractrole_description: 'No name'
      });

    expect(res.statusCode).toBe(400);
  });

  it('returns 403 for reader role', async () => {
    const res = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
      .set('Cookie', [`token=${readerToken()}`])
      .send({
        vendorcontractrole_name: 'Role'
      });

    expect(res.statusCode).toBe(403);
  });
});

describe('PUT /api/vendors/:vendorId/contracts/:contractId/roles/:roleId', () => {
  let testRoleId;

  beforeAll(async () => {
    // Create a role for testing
    const roleRes = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorcontractrole_name: 'Update Test Role'
      });
    testRoleId = roleRes.body.data.id;
  });

  it('updates role name (200)', async () => {
    const res = await request
      .put(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${testRoleId}`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorcontractrole_name: 'Updated Name'
      });

    expect(res.statusCode).toBe(200);
  });

  it('updates description (200)', async () => {
    const res = await request
      .put(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${testRoleId}`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorcontractrole_description: 'Updated description'
      });

    expect(res.statusCode).toBe(200);
  });

  it('returns 404 for non-existent role', async () => {
    const res = await request
      .put(`/api/vendors/${vendorId}/contracts/${contractId}/roles/99999`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorcontractrole_name: 'Updated'
      });

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 for reader role', async () => {
    const res = await request
      .put(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${testRoleId}`)
      .set('Cookie', [`token=${readerToken()}`])
      .send({
        vendorcontractrole_name: 'Updated'
      });

    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /api/vendors/:vendorId/contracts/:contractId/roles/:roleId', () => {
  let testRoleId;

  beforeAll(async () => {
    // Create a role for testing
    const roleRes = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorcontractrole_name: 'Delete Test Role'
      });
    testRoleId = roleRes.body.data.id;
  });

  it('soft deletes a role (200)', async () => {
    const res = await request
      .delete(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${testRoleId}`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
  });

  it('deleted role is absent from GET list', async () => {
    // Role was deleted in previous test
    const res = await request
      .get(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    const found = res.body.data.find(r => r.id === testRoleId);
    expect(found).toBeUndefined();
  });

  it('returns 404 for non-existent role', async () => {
    const res = await request
      .delete(`/api/vendors/${vendorId}/contracts/${contractId}/roles/99999`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 for reader role', async () => {
    // Create another role to delete
    const roleRes = await request
      .post(`/api/vendors/${vendorId}/contracts/${contractId}/roles`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorcontractrole_name: 'For reader delete test'
      });

    const res = await request
      .delete(`/api/vendors/${vendorId}/contracts/${contractId}/roles/${roleRes.body.data.id}`)
      .set('Cookie', [`token=${readerToken()}`]);

    expect(res.statusCode).toBe(403);
  });
});
