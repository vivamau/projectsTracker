const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken } = require('../helpers/testAuth');

let db, app, projectId, budgetId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);

  // Create a project and budget
  const projRes = await request(app)
    .post('/api/projects')
    .set('Cookie', ['token=' + adminToken()])
    .send({ project_name: 'PO Test Project' });
  projectId = projRes.body.data.id;

  const budgetRes = await request(app)
    .post(`/api/projects/${projectId}/budgets`)
    .set('Cookie', ['token=' + adminToken()])
    .send({ budget_amount: 50000 });
  budgetId = budgetRes.body.data.id;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/budgets/:id', () => {
  it('should return budget details', async () => {
    const res = await request(app)
      .get(`/api/budgets/${budgetId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data.budget_amount).toBe(50000);
  });

  it('should return 404 for non-existent budget', async () => {
    const res = await request(app)
      .get('/api/budgets/99999')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/budgets/:id/purchase-orders', () => {
  it('should return empty array initially', async () => {
    const res = await request(app)
      .get(`/api/budgets/${budgetId}/purchase-orders`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get(`/api/budgets/${budgetId}/purchase-orders`);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/budgets/:id/purchase-orders', () => {
  it('should create a purchase order', async () => {
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders`)
      .set('Cookie', ['token=' + adminToken()])
      .send({
        purchaseorder_description: 'Server purchase',
        purchaseorder_start_date: Date.now()
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });

  it('should return 400 when start_date is missing', async () => {
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ purchaseorder_description: 'No date' });

    expect(res.status).toBe(400);
  });

  it('should return 403 for reader', async () => {
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders`)
      .set('Cookie', ['token=' + readerToken()])
      .send({ purchaseorder_start_date: Date.now() });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/budgets/:id/purchase-orders/:poId', () => {
  let poId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders`)
      .set('Cookie', ['token=' + adminToken()])
      .send({
        purchaseorder_description: 'To update',
        purchaseorder_start_date: Date.now()
      });
    poId = res.body.data.id;
  });

  it('should update a purchase order', async () => {
    const res = await request(app)
      .put(`/api/budgets/${budgetId}/purchase-orders/${poId}`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ purchaseorder_description: 'Updated PO' });

    expect(res.status).toBe(200);
  });

  it('should return 404 for non-existent PO', async () => {
    const res = await request(app)
      .put(`/api/budgets/${budgetId}/purchase-orders/99999`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ purchaseorder_description: 'Nope' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/budgets/:id/purchase-orders/:poId', () => {
  let poId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders`)
      .set('Cookie', ['token=' + adminToken()])
      .send({
        purchaseorder_description: 'To delete',
        purchaseorder_start_date: Date.now()
      });
    poId = res.body.data.id;
  });

  it('should soft delete a purchase order', async () => {
    const res = await request(app)
      .delete(`/api/budgets/${budgetId}/purchase-orders/${poId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);

    // Verify it's gone from the list
    const listRes = await request(app)
      .get(`/api/budgets/${budgetId}/purchase-orders`)
      .set('Cookie', ['token=' + adminToken()]);

    const found = listRes.body.data.find(po => po.id === poId);
    expect(found).toBeUndefined();
  });

  it('should return 404 for non-existent PO', async () => {
    const res = await request(app)
      .delete(`/api/budgets/${budgetId}/purchase-orders/99999`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(404);
  });
});
