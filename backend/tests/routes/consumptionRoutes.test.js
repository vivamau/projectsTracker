const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken, guestToken } = require('../helpers/testAuth');
const { runQuery } = require('../../config/database');

let db, app;
let budgetId, poId, itemId;

function monthEpoch(year, month) {
  return new Date(year, month, 1).getTime();
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);

  await runQuery(db,
    "INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)",
    ['USD', Date.now()]
  );

  const projectRes = await request(app)
    .post('/api/projects')
    .set('Cookie', ['token=' + adminToken()])
    .send({ project_name: 'Consumption Route Test', division_id: 1 });
  const projectId = projectRes.body.data.id;

  const budgetRes = await request(app)
    .post(`/api/projects/${projectId}/budgets`)
    .set('Cookie', ['token=' + adminToken()])
    .send({ budget_amount: 100000, currency_id: 1 });
  budgetId = budgetRes.body.data.id;

  const vendorRes = await request(app)
    .post('/api/vendors')
    .set('Cookie', ['token=' + adminToken()])
    .send({ vendor_name: 'Test Vendor', vendor_email: 'vendor@test.com' });
  const vendorId = vendorRes.body.data.id;

  const poRes = await request(app)
    .post(`/api/budgets/${budgetId}/purchase-orders`)
    .set('Cookie', ['token=' + adminToken()])
    .send({
      purchaseorder_description: 'Test PO',
      purchaseorder_start_date: Date.now(),
      vendor_id: vendorId
    });
  poId = poRes.body.data.id;

  const itemRes = await request(app)
    .post(`/api/budgets/${budgetId}/purchase-orders/${poId}/items`)
    .set('Cookie', ['token=' + adminToken()])
    .send({
      purchaseorderitem_description: 'Test Item',
      purchaseorderitem_start_date: Date.now(),
      purchaseorderitems_days: 20
    });
  itemId = itemRes.body.data.id;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/budgets/:id/purchase-orders/:poId/items/:itemId/consumptions', () => {
  it('returns consumptions with summary', async () => {
    const res = await request(app)
      .get(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.entries).toBeDefined();
    expect(res.body.data.total_days_used).toBeDefined();
    expect(res.body.data.allocated_days).toBe(20);
    expect(res.body.data.utilization_pct).toBeDefined();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .get(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/budgets/:id/purchase-orders/:poId/items/:itemId/consumptions', () => {
  it('creates a consumption entry as admin', async () => {
    const month = monthEpoch(2026, 0);
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({
        consumption_month: month,
        consumption_days: 12.5,
        consumption_comment: 'January report'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  });

  it('returns 400 when consumption_month is missing', async () => {
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ consumption_days: 5 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when consumption_days is missing', async () => {
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ consumption_month: monthEpoch(2026, 1) });

    expect(res.status).toBe(400);
  });

  it('returns 400 when consumption_days is negative', async () => {
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ consumption_month: monthEpoch(2026, 1), consumption_days: -1 });

    expect(res.status).toBe(400);
  });

  it('returns 403 when guest tries to create', async () => {
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`)
      .set('Cookie', ['token=' + guestToken()])
      .send({ consumption_month: monthEpoch(2026, 2), consumption_days: 5 });

    expect(res.status).toBe(403);
  });

  it('returns 409 on duplicate month for same item', async () => {
    const month = monthEpoch(2026, 0);
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ consumption_month: month, consumption_days: 5 });

    expect(res.status).toBe(409);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`)
      .send({ consumption_month: monthEpoch(2026, 3), consumption_days: 5 });

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/budgets/:id/purchase-orders/:poId/items/:itemId/consumptions/:consumptionId', () => {
  let consumptionId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ consumption_month: monthEpoch(2026, 3), consumption_days: 5 });
    consumptionId = res.body.data.id;
  });

  it('updates a consumption entry as admin', async () => {
    const res = await request(app)
      .put(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions/${consumptionId}`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ consumption_days: 7.5, consumption_comment: 'Corrected' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for non-existent consumption', async () => {
    const res = await request(app)
      .put(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions/99999`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ consumption_days: 1 });

    expect(res.status).toBe(404);
  });

  it('returns 403 when reader tries to update', async () => {
    const res = await request(app)
      .put(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions/${consumptionId}`)
      .set('Cookie', ['token=' + readerToken()])
      .send({ consumption_days: 1 });

    expect(res.status).toBe(403);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .put(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions/${consumptionId}`)
      .send({ consumption_days: 1 });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/budgets/:id/purchase-orders/:poId/items/:itemId/consumptions/:consumptionId', () => {
  let consumptionId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ consumption_month: monthEpoch(2026, 4), consumption_days: 3 });
    consumptionId = res.body.data.id;
  });

  it('soft deletes a consumption entry as admin', async () => {
    const res = await request(app)
      .delete(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions/${consumptionId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for non-existent consumption', async () => {
    const res = await request(app)
      .delete(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions/99999`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(404);
  });

  it('returns 403 when reader tries to delete', async () => {
    const res = await request(app)
      .delete(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions/1`)
      .set('Cookie', ['token=' + readerToken()]);

    expect(res.status).toBe(403);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .delete(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions/1`);

    expect(res.status).toBe(401);
  });
});

describe('Consumption summary reflects updates', () => {
  it('shows updated utilization after creating consumptions', async () => {
    const res = await request(app)
      .get(`/api/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data.total_days_used).toBeGreaterThan(0);
    expect(res.body.data.utilization_pct).toBeGreaterThan(0);
  });
});
