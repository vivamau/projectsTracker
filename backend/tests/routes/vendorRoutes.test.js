const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken } = require('../helpers/testAuth');
const vendorService = require('../../services/vendorService');
const budgetService = require('../../services/budgetService');
const currencyService = require('../../services/currencyService');
const purchaseOrderService = require('../../services/purchaseOrderService');
const purchaseOrderItemService = require('../../services/purchaseOrderItemService');
const projectService = require('../../services/projectService');
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

describe('GET /api/vendors/:vendorId/resources/:resourceId/projects', () => {
  let testVendorId, testResourceId;

  beforeAll(async () => {
    const vRes = await vendorService.create(db, { vendor_name: 'Resource Route Vendor' });
    testVendorId = vRes.lastID;

    await runQuery(db,
      `INSERT INTO vendorresources (vendorresource_name, vendorresource_lastname, vendor_id, vendorresource_create_date)
       VALUES (?, ?, ?, ?)`,
      ['Route', 'Test', testVendorId, Date.now()]
    );
    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT id FROM vendorresources WHERE vendor_id = ? ORDER BY id DESC LIMIT 1', [testVendorId], (err, r) => {
        if (err) reject(err);
        else resolve(r);
      });
    });
    testResourceId = rows[0].id;
  });

  it('should return empty array when resource has no PO items', async () => {
    const res = await request(app)
      .get(`/api/vendors/${testVendorId}/resources/${testResourceId}/projects`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('should return projects linked to resource via PO items', async () => {
    const pRes = await projectService.create(db, { project_name: 'Resource Route Project', division_id: 1 });
    const cRes = await currencyService.create(db, { currency_name: 'RRP' });
    const bRes = await budgetService.create(db, {
      budget_amount: 5000,
      currency_id: cRes.lastID,
      budget_start_date: Date.now()
    });
    await budgetService.linkToProject(db, pRes.lastID, bRes.lastID);
    const poRes = await purchaseOrderService.create(db, {
      purchaseorder_description: 'Route PO',
      purchaseorder_start_date: Date.now(),
      budget_id: bRes.lastID,
      vendor_id: testVendorId
    });
    await purchaseOrderItemService.create(db, {
      purchaseorderitem_start_date: Date.now(),
      purchaseorder_id: poRes.lastID,
      vendorresource_id: testResourceId
    });

    const res = await request(app)
      .get(`/api/vendors/${testVendorId}/resources/${testResourceId}/projects`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].project_name).toBe('Resource Route Project');
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get(`/api/vendors/${testVendorId}/resources/${testResourceId}/projects`);
    expect(res.status).toBe(401);
  });
});
