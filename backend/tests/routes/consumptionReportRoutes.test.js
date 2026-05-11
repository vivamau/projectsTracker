const request = require('supertest');
const path = require('path');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken } = require('../helpers/testAuth');
const { runQuery } = require('../../config/database');
const purchaseOrderService = require('../../services/purchaseOrderService');
const purchaseOrderItemService = require('../../services/purchaseOrderItemService');
const budgetService = require('../../services/budgetService');
const vendorService = require('../../services/vendorService');
const projectService = require('../../services/projectService');
const poitemConsumptionService = require('../../services/poitemConsumptionService');

// Mock pdf-parse v2 so tests don't need a real PDF file
// Note: jest.mock is hoisted, so the text must be inlined here
jest.mock('pdf-parse', () => {
  const defaultText = `
Vendor name: \tTest Vendor
Project name: \tTest Project
Project focal-point(s): \tTest User@wfp.org
Purchase Order (PO): \tPO 9999888877
Total number of days on the PO: \t30
PO amount: \tEUR 18000
daily rate \tEUR 600
Invoice related to period: \tMarch 2026
Days consumed during this period: 10

● Test Resource, Senior Engineer

Role \tDaily rate \tDays \tTotal
March
Senior Engineer \tEUR 600 \t10 \tEUR 6000
Total \tEUR 6000
`;
  return {
    PDFParse: jest.fn().mockImplementation(() => ({
      getText: jest.fn().mockResolvedValue({ text: defaultText }),
      destroy: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

let db, app, projectId, budgetId, poId, itemId, vendorId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);

  const projectRes = await projectService.create(db, {
    project_name: 'Report Upload Test Project',
    division_id: 1
  });
  projectId = projectRes.lastID;

  const vendorRes = await vendorService.create(db, {
    vendor_name: 'Test Vendor',
    vendor_email: 'tv@test.com'
  });
  vendorId = vendorRes.lastID;

  const budgetRes = await budgetService.create(db, {
    budget_amount: 20000,
    budget_start_date: Date.now()
  });
  budgetId = budgetRes.lastID;
  await budgetService.linkToProject(db, projectId, budgetId);

  const poRes = await purchaseOrderService.create(db, {
    purchaseorder_description: 'WFP PO 9999888877',
    purchaseorder_start_date: Date.now(),
    budget_id: budgetId,
    vendor_id: vendorId
  });
  poId = poRes.lastID;

  const itemRes = await purchaseOrderItemService.create(db, {
    purchaseorderitem_description: 'Test Resource item',
    purchaseorderitem_start_date: Date.now(),
    purchaseorderitems_days: 30,
    purchaseorder_id: poId
  });
  itemId = itemRes.lastID;
});

afterAll(() => closeTestDb(db));

describe('POST /api/projects/:id/consumption-reports/parse', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/consumption-reports/parse`)
      .attach('report', Buffer.from('fake pdf'), { filename: 'report.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(401);
  });

  it('rejects non-admin users', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/consumption-reports/parse`)
      .set('Cookie', [`token=${readerToken()}`])
      .attach('report', Buffer.from('fake pdf'), { filename: 'report.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when no file is uploaded', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/consumption-reports/parse`)
      .set('Cookie', [`token=${adminToken()}`]);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/file/i);
  });

  it('parses PDF and returns extracted data with matched PO', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/consumption-reports/parse`)
      .set('Cookie', [`token=${adminToken()}`])
      .attach('report', Buffer.from('fake pdf content'), { filename: 'report.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.parsed.poNumber).toBe('9999888877');
    expect(data.parsed.daysConsumed).toBe(10);
    expect(data.parsed.currency).toBe('EUR');
    expect(data.parsed.resources).toHaveLength(1);
    expect(data.matchedPO).not.toBeNull();
    expect(data.matchedPO.id).toBe(poId);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].id).toBe(itemId);
  });

  it('returns matchedPO as null when PO number not found in DB', async () => {
    // Override mock for this test: PO number not in DB
    const { PDFParse } = require('pdf-parse');
    PDFParse.mockImplementationOnce(() => ({
      getText: jest.fn().mockResolvedValue({
        text: 'Purchase Order (PO): PO 0000000000\nDays consumed during this period: 5'
      }),
      destroy: jest.fn().mockResolvedValue(undefined)
    }));

    const res = await request(app)
      .post(`/api/projects/${projectId}/consumption-reports/parse`)
      .set('Cookie', [`token=${adminToken()}`])
      .attach('report', Buffer.from('fake'), { filename: 'r.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.data.matchedPO).toBeNull();
  });
});

describe('POST /api/projects/:id/consumption-reports/apply', () => {
  const consumptionMonth = new Date(2026, 2, 1).getTime();

  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/consumption-reports/apply`)
      .send({ entries: [] });
    expect(res.status).toBe(401);
  });

  it('rejects non-admin users', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/consumption-reports/apply`)
      .set('Cookie', [`token=${readerToken()}`])
      .send({ entries: [{ purchaseorderitem_id: itemId, consumption_days: 10, consumption_month: consumptionMonth }] });
    expect(res.status).toBe(403);
  });

  it('returns 400 when entries is missing or empty', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/consumption-reports/apply`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for entry missing required fields', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/consumption-reports/apply`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({ entries: [{ purchaseorderitem_id: itemId }] });
    expect(res.status).toBe(400);
  });

  it('creates consumption entries and returns created count', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/consumption-reports/apply`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        entries: [{
          purchaseorderitem_id: itemId,
          consumption_days: 10,
          consumption_month: consumptionMonth,
          consumption_comment: 'March 2026 report'
        }]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.created).toBe(1);

    const summary = await poitemConsumptionService.getByItemIdWithSummary(db, itemId);
    expect(summary.total_days_used).toBe(10);
  });

  it('returns 409 on duplicate month for same item', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/consumption-reports/apply`)
      .set('Cookie', [`token=${adminToken()}`])
      .send({
        entries: [{
          purchaseorderitem_id: itemId,
          consumption_days: 5,
          consumption_month: consumptionMonth
        }]
      });
    expect(res.status).toBe(409);
  });
});
