const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const purchaseOrderService = require('../../services/purchaseOrderService');
const budgetService = require('../../services/budgetService');

let db, budgetId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
  const budget = await budgetService.create(db, { budget_amount: 100000 });
  budgetId = budget.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('purchaseOrderService.create', () => {
  it('should create a purchase order linked to a budget', async () => {
    const result = await purchaseOrderService.create(db, {
      purchaseorder_description: 'PO for servers',
      purchaseorder_start_date: Date.now(),
      budget_id: budgetId
    });
    expect(result.lastID).toBeDefined();
    expect(result.changes).toBe(1);
  });

  it('should create a PO with all optional fields', async () => {
    const now = Date.now();
    const result = await purchaseOrderService.create(db, {
      purchaseorder_description: 'PO for licenses',
      purchaseorder_start_date: now,
      purchaseorder_end_date: now + 86400000,
      budget_id: budgetId,
      vendor_id: null,
      user_id: 1
    });
    expect(result.lastID).toBeDefined();
  });
});

describe('purchaseOrderService.getByBudgetId', () => {
  it('should return purchase orders for a budget', async () => {
    const pos = await purchaseOrderService.getByBudgetId(db, budgetId);
    expect(pos.length).toBe(2);
    expect(pos[0].purchaseorder_description).toBeDefined();
    expect(pos[0].budget_id).toBe(budgetId);
  });

  it('should return empty array for budget with no POs', async () => {
    const budget2 = await budgetService.create(db, { budget_amount: 5000 });
    const pos = await purchaseOrderService.getByBudgetId(db, budget2.lastID);
    expect(pos).toEqual([]);
  });
});

describe('purchaseOrderService.getById', () => {
  it('should return a purchase order by id', async () => {
    const po = await purchaseOrderService.getById(db, 1);
    expect(po).toBeDefined();
    expect(po.purchaseorder_description).toBe('PO for servers');
    expect(po.budget_id).toBe(budgetId);
  });

  it('should return null for non-existent id', async () => {
    const po = await purchaseOrderService.getById(db, 99999);
    expect(po).toBeNull();
  });
});

describe('purchaseOrderService.update', () => {
  it('should update a purchase order description', async () => {
    const result = await purchaseOrderService.update(db, 1, {
      purchaseorder_description: 'Updated PO description'
    });
    expect(result.changes).toBe(1);

    const po = await purchaseOrderService.getById(db, 1);
    expect(po.purchaseorder_description).toBe('Updated PO description');
  });

  it('should update dates', async () => {
    const newEnd = Date.now() + 86400000 * 30;
    const result = await purchaseOrderService.update(db, 1, {
      purchaseorder_end_date: newEnd
    });
    expect(result.changes).toBe(1);
  });

  it('should return changes=0 when no fields provided', async () => {
    const result = await purchaseOrderService.update(db, 1, {});
    expect(result.changes).toBe(0);
  });
});

describe('purchaseOrderService.softDelete', () => {
  it('should soft delete a purchase order', async () => {
    const result = await purchaseOrderService.softDelete(db, 2);
    expect(result.changes).toBe(1);
  });

  it('should not return soft-deleted PO in getById', async () => {
    const po = await purchaseOrderService.getById(db, 2);
    expect(po).toBeNull();
  });

  it('should not return soft-deleted PO in getByBudgetId', async () => {
    const pos = await purchaseOrderService.getByBudgetId(db, budgetId);
    expect(pos.length).toBe(1);
  });

  it('should return changes=0 for non-existent id', async () => {
    const result = await purchaseOrderService.softDelete(db, 99999);
    expect(result.changes).toBe(0);
  });
});
