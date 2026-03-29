const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken, guestToken } = require('../helpers/testAuth');
const { runQuery } = require('../../config/database');

let db, app, projectId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);

  // Seed a currency
  await runQuery(db,
    "INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)",
    ['USD', Date.now()]
  );

  // Create a test project
  const res = await request(app)
    .post('/api/projects')
    .set('Cookie', ['token=' + adminToken()])
    .send({ project_name: 'Budget Test Project', division_id: 1 });

  projectId = res.body.data.id;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('GET /api/projects/:id/budgets', () => {
  it('should list budgets for a project', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/budgets`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/budgets`);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/projects/:id/budgets', () => {
  it('should create and link a budget as admin', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/budgets`)
      .set('Cookie', ['token=' + adminToken()])
      .send({
        budget_amount: 50000,
        currency_id: 1
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  });

  it('should return 400 when budget_amount is missing', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/budgets`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ currency_id: 1 });

    expect(res.status).toBe(400);
  });

  it('should return 400 when budget_amount is negative', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/budgets`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ budget_amount: -100 });

    expect(res.status).toBe(400);
  });

  it('should return 403 when reader tries to create', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/budgets`)
      .set('Cookie', ['token=' + readerToken()])
      .send({ budget_amount: 10000 });

    expect(res.status).toBe(403);
  });

  it('should return 403 when guest tries to create', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/budgets`)
      .set('Cookie', ['token=' + guestToken()])
      .send({ budget_amount: 10000 });

    expect(res.status).toBe(403);
  });

  it('should list created budgets with currency', async () => {
    await request(app)
      .post(`/api/projects/${projectId}/budgets`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ budget_amount: 25000, currency_id: 1 });

    const res = await request(app)
      .get(`/api/projects/${projectId}/budgets`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0].currency_name).toBe('USD');
  });
});

describe('GET /api/projects/:id/budgets/total', () => {
  it('should return total budget for a project', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/budgets/total`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/budgets/total`);

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/projects/:id/budgets/:budgetId', () => {
  let budgetId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/budgets`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ budget_amount: 30000, currency_id: 1 });

    budgetId = res.body.data.id;
  });

  it('should update a budget as admin', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/budgets/${budgetId}`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ budget_amount: 35000 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 for non-existent budget', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/budgets/99999`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ budget_amount: 1000 });

    expect(res.status).toBe(404);
  });

  it('should return 403 when reader tries to update', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/budgets/${budgetId}`)
      .set('Cookie', ['token=' + readerToken()])
      .send({ budget_amount: 40000 });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/projects/:id/budgets/:budgetId', () => {
  let budgetId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/budgets`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ budget_amount: 5000 });

    budgetId = res.body.data.id;
  });

  it('should soft delete a budget and unlink from project', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}/budgets/${budgetId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 for non-existent budget', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}/budgets/99999`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(404);
  });

  it('should return 403 when reader tries to delete', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}/budgets/1`)
      .set('Cookie', ['token=' + readerToken()]);

    expect(res.status).toBe(403);
  });
});
