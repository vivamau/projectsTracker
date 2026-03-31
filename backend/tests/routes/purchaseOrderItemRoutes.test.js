const supertest = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken } = require('../helpers/testAuth');

let db, app, request;
let budgetId, poId, currencyId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);
  request = supertest(app);

  // Create currency
  const currRes = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)`,
      ['USD', Date.now()],
      function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID });
      }
    );
  });
  currencyId = currRes.lastID;

  // Create project via HTTP
  const projectRes = await request
    .post('/api/projects')
    .set('Cookie', [`token=${adminToken()}`])
    .send({
      project_name: 'Test Project',
      division_id: 1,
      project_description: 'Test'
    });
  const projectId = projectRes.body.data.id;

  // Create budget via HTTP
  const budgetRes = await request
    .post('/api/projects/' + projectId + '/budgets')
    .set('Cookie', [`token=${adminToken()}`])
    .send({
      budget_name: 'Test Budget',
      budget_amount: 1000,
      budget_start_date: Date.now(),
      currency_id: currencyId
    });
  budgetId = budgetRes.body.data.id;

  // Create PO via HTTP
  const poRes = await request
    .post('/api/budgets/' + budgetId + '/purchase-orders')
    .set('Cookie', [`token=${adminToken()}`])
    .send({
      purchaseorder_description: 'Test PO',
      purchaseorder_start_date: Date.now()
    });
  poId = poRes.body.data.id;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/budgets/:id/purchase-orders/:poId/items', () => {
  it('returns empty array initially (authenticated)', async () => {
    const res = await request
      .get(`/api/budgets/${budgetId}/purchase-orders/${poId}/items`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request
      .get(`/api/budgets/${budgetId}/purchase-orders/${poId}/items`);

    expect(res.statusCode).toBe(401);
  });

  it('returns items list after creation', async () => {
    const startDate = Date.now();

    // Create item
    await request
      .post(`/api/budgets/${budgetId}/purchase-orders/${poId}/items`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorderitem_description: 'Item 1',
        purchaseorderitem_start_date: startDate,
        currency_id: currencyId
      });

    // Get list
    const res = await request
      .get(`/api/budgets/${budgetId}/purchase-orders/${poId}/items`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const item = res.body.data[0];
    expect(item.purchaseorderitem_description).toBe('Item 1');
    expect(item.currency_name).toBe('USD');
  });
});

describe('POST /api/budgets/:id/purchase-orders/:poId/items', () => {
  let testPoId;

  beforeAll(async () => {
    // Create a separate PO for these tests
    const poRes = await request
      .post(`/api/budgets/${budgetId}/purchase-orders`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorder_description: 'Test PO 2',
        purchaseorder_start_date: Date.now()
      });
    testPoId = poRes.body.data.id;
  });

  it('creates an item with start_date (201)', async () => {
    const startDate = Date.now();

    const res = await request
      .post(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorderitem_description: 'New Item',
        purchaseorderitem_start_date: startDate
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
  });

  it('creates an item with all fields', async () => {
    const startDate = Date.now();
    const endDate = startDate + 86400000;

    const res = await request
      .post(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorderitem_description: 'Full Item',
        purchaseorderitem_start_date: startDate,
        purchaseorderitem_end_date: endDate,
        purchaseorderitems_days: 5,
        purchaseorderitems_discounted_rate: 1500.50,
        currency_id: currencyId
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
  });

  it('creates an item with vendor contract role', async () => {
    // Setup vendor and contract role
    const vendorRes = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO vendors (vendor_name, vendor_create_date) VALUES (?, ?)`,
        ['Test Vendor', Date.now()],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        }
      );
    });
    const vendorId = vendorRes.lastID;

    const contractRes = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO vendorcontracts (contract_name, contract_start_date, vendor_id, contract_create_date)
         VALUES (?, ?, ?, ?)`,
        ['Test Contract', Date.now(), vendorId, Date.now()],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        }
      );
    });
    const vendorContractId = contractRes.lastID;

    const roleRes = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO vendorcontractroles (vendorcontractrole_name, vendorcontract_id, vendorcontractrole_create_date)
         VALUES (?, ?, ?)`,
        ['Consultant', vendorContractId, Date.now()],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        }
      );
    });
    const vendorRoleId = roleRes.lastID;

    const startDate = Date.now();
    const res = await request
      .post(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorderitem_description: 'Item with vendor role',
        purchaseorderitem_start_date: startDate,
        vendorcontractrole_id: vendorRoleId
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
  });

  it('returns 400 when purchaseorderitem_start_date is missing', async () => {
    const res = await request
      .post(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorderitem_description: 'No date'
      });

    expect(res.statusCode).toBe(400);
  });

  it('returns 403 for reader role', async () => {
    const res = await request
      .post(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items`)
      .set('Cookie', [`token=${readerToken()}`])
      .send({
        purchaseorderitem_description: 'Item',
        purchaseorderitem_start_date: Date.now()
      });

    expect(res.statusCode).toBe(403);
  });
});

describe('PUT /api/budgets/:id/purchase-orders/:poId/items/:itemId', () => {
  let testPoId, testItemId;

  beforeAll(async () => {
    // Create PO
    const poRes = await request
      .post(`/api/budgets/${budgetId}/purchase-orders`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorder_description: 'Update Test PO',
        purchaseorder_start_date: Date.now()
      });
    testPoId = poRes.body.data.id;

    // Create item
    const itemRes = await request
      .post(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorderitem_description: 'Original',
        purchaseorderitem_start_date: Date.now()
      });
    testItemId = itemRes.body.data.id;
  });

  it('updates an item description (200)', async () => {
    const res = await request
      .put(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items/${testItemId}`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorderitem_description: 'Updated'
      });

    expect(res.statusCode).toBe(200);
  });

  it('updates numeric fields (200)', async () => {
    const res = await request
      .put(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items/${testItemId}`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorderitems_days: 10,
        purchaseorderitems_discounted_rate: 2000.75
      });

    expect(res.statusCode).toBe(200);
  });

  it('updates currency_id (200)', async () => {
    const res = await request
      .put(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items/${testItemId}`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        currency_id: currencyId
      });

    expect(res.statusCode).toBe(200);
  });

  it('updates vendorcontractrole_id (200)', async () => {
    // Create vendor contract role
    const vendorRes = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO vendors (vendor_name, vendor_create_date) VALUES (?, ?)`,
        ['Test Vendor', Date.now()],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        }
      );
    });

    const contractRes = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO vendorcontracts (contract_name, contract_start_date, vendor_id, contract_create_date)
         VALUES (?, ?, ?, ?)`,
        ['Test Contract', Date.now(), vendorRes.lastID, Date.now()],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        }
      );
    });

    const roleRes = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO vendorcontractroles (vendorcontractrole_name, vendorcontract_id, vendorcontractrole_create_date)
         VALUES (?, ?, ?)`,
        ['Consultant', contractRes.lastID, Date.now()],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        }
      );
    });

    const res = await request
      .put(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items/${testItemId}`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        vendorcontractrole_id: roleRes.lastID
      });

    expect(res.statusCode).toBe(200);
  });

  it('returns 404 for non-existent item', async () => {
    const res = await request
      .put(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items/99999`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorderitem_description: 'Updated'
      });

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 for reader role', async () => {
    const res = await request
      .put(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items/${testItemId}`)
      .set('Cookie', [`token=${readerToken()}`])
      .send({
        purchaseorderitem_description: 'Updated'
      });

    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /api/budgets/:id/purchase-orders/:poId/items/:itemId', () => {
  let testPoId, testItemId;

  beforeAll(async () => {
    // Create PO
    const poRes = await request
      .post(`/api/budgets/${budgetId}/purchase-orders`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorder_description: 'Delete Test PO',
        purchaseorder_start_date: Date.now()
      });
    testPoId = poRes.body.data.id;

    // Create item
    const itemRes = await request
      .post(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorderitem_description: 'To delete',
        purchaseorderitem_start_date: Date.now()
      });
    testItemId = itemRes.body.data.id;
  });

  it('soft deletes an item (200)', async () => {
    const res = await request
      .delete(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items/${testItemId}`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
  });

  it('deleted item is absent from GET list', async () => {
    // Item was deleted in previous test
    const res = await request
      .get(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(200);
    const found = res.body.data.find(i => i.id === testItemId);
    expect(found).toBeUndefined();
  });

  it('returns 404 for non-existent item', async () => {
    const res = await request
      .delete(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items/99999`)
      .set('Cookie', [`token=${adminToken()}`]);

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 for reader role', async () => {
    // Create another item to delete
    const itemRes = await request
      .post(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        purchaseorderitem_description: 'For delete test',
        purchaseorderitem_start_date: Date.now()
      });

    const res = await request
      .delete(`/api/budgets/${budgetId}/purchase-orders/${testPoId}/items/${itemRes.body.data.id}`)
      .set('Cookie', [`token=${readerToken()}`]);

    expect(res.statusCode).toBe(403);
  });
});
