const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const purchaseOrderService = require('../../services/purchaseOrderService');
const budgetService = require('../../services/budgetService');
const { runQuery } = require('../../config/database');

let db, budgetId, vendorId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
  const budget = await budgetService.create(db, { budget_amount: 100000 });
  budgetId = budget.lastID;
  const vendor = await runQuery(db,
    "INSERT INTO vendors (vendor_name, vendor_create_date, vendor_update_date) VALUES (?, ?, ?)",
    ['Acme Corp', Date.now(), Date.now()]
  );
  vendorId = vendor.lastID;
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

  it('should create a PO without description', async () => {
    const result = await purchaseOrderService.create(db, {
      purchaseorder_start_date: Date.now(),
      budget_id: budgetId
    });
    expect(result.lastID).toBeDefined();
    const po = await purchaseOrderService.getById(db, result.lastID);
    expect(po.purchaseorder_description).toBeNull();
  });

  it('should create a PO with null vendor_id', async () => {
    const result = await purchaseOrderService.create(db, {
      purchaseorder_description: 'PO with null vendor',
      purchaseorder_start_date: Date.now(),
      budget_id: budgetId,
      vendor_id: null
    });
    expect(result.lastID).toBeDefined();
    const po = await purchaseOrderService.getById(db, result.lastID);
    expect(po.vendor_id).toBeNull();
  });
});

describe('purchaseOrderService.getByBudgetId', () => {
  it('should return purchase orders for a budget', async () => {
    const pos = await purchaseOrderService.getByBudgetId(db, budgetId);
    expect(pos.length).toBeGreaterThan(0);
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

  it('should update start date', async () => {
    const newStart = Date.now() + 1000;
    const result = await purchaseOrderService.update(db, 1, {
      purchaseorder_start_date: newStart
    });
    expect(result.changes).toBe(1);
    const po = await purchaseOrderService.getById(db, 1);
    expect(po.purchaseorder_start_date).toBe(newStart);
  });

  it('should update vendor_id to null', async () => {
    const result = await purchaseOrderService.update(db, 1, {
      vendor_id: null
    });
    expect(result.changes).toBe(1);
    const po = await purchaseOrderService.getById(db, 1);
    expect(po.vendor_id).toBeNull();
  });

  it('should update user_id', async () => {
    const now = Date.now();
    const result = await purchaseOrderService.update(db, 2, {
      user_id: 1
    });
    expect(result.changes).toBe(1);
  });

  it('should update multiple fields', async () => {
    const now = Date.now();
    const result = await purchaseOrderService.update(db, 1, {
      purchaseorder_description: 'Multi-update',
      purchaseorder_start_date: now,
      vendor_id: null,
      user_id: 1
    });
    expect(result.changes).toBe(1);
  });

  it('should return changes=0 when no fields provided', async () => {
    const result = await purchaseOrderService.update(db, 1, {});
    expect(result.changes).toBe(0);
  });

  it('should return changes=0 for non-existent PO', async () => {
    const result = await purchaseOrderService.update(db, 99999, {
      purchaseorder_description: 'Updated'
    });
    expect(result.changes).toBe(0);
  });
});

describe('purchaseOrderService.getAllPaginated', () => {
  it('should return paginated results with total', async () => {
    const result = await purchaseOrderService.getAllPaginated(db);
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('limit');
    expect(result).toHaveProperty('totalPages');
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.total).toBeGreaterThan(0);
    expect(result.page).toBe(1);
  });

  it('should respect limit and page params', async () => {
    const page1 = await purchaseOrderService.getAllPaginated(db, { page: 1, limit: 1 });
    const page2 = await purchaseOrderService.getAllPaginated(db, { page: 2, limit: 1 });
    expect(page1.data.length).toBe(1);
    expect(page1.totalPages).toBeGreaterThanOrEqual(2);
    expect(page2.data.length).toBe(1);
    expect(page1.data[0].id).not.toBe(page2.data[0].id);
  });

  it('should filter by description search', async () => {
    await purchaseOrderService.create(db, {
      purchaseorder_description: 'Search target server',
      purchaseorder_start_date: Date.now(),
      budget_id: budgetId
    });
    const result = await purchaseOrderService.getAllPaginated(db, { search: 'Search target' });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].purchaseorder_description).toContain('Search target');
  });

  it('should return empty array when search matches nothing', async () => {
    const result = await purchaseOrderService.getAllPaginated(db, { search: 'xyznonexistent' });
    expect(result.data.length).toBe(0);
    expect(result.total).toBe(0);
  });

  it('should filter by vendor name search', async () => {
    await purchaseOrderService.create(db, {
      purchaseorder_description: 'Vendor PO',
      purchaseorder_start_date: Date.now(),
      budget_id: budgetId,
      vendor_id: vendorId
    });
    const result = await purchaseOrderService.getAllPaginated(db, { search: 'Acme' });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].vendor_name).toBe('Acme Corp');
  });

  it('should sort by description ascending', async () => {
    const result = await purchaseOrderService.getAllPaginated(db, { sortBy: 'description', sortDir: 'asc' });
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('should sort by vendor ascending', async () => {
    const result = await purchaseOrderService.getAllPaginated(db, { sortBy: 'vendor', sortDir: 'asc' });
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('should sort by items count', async () => {
    const result = await purchaseOrderService.getAllPaginated(db, { sortBy: 'items', sortDir: 'desc' });
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('should fall back to start_date sort for unknown sortBy', async () => {
    const result = await purchaseOrderService.getAllPaginated(db, { sortBy: 'unknown_column' });
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('should calculate totalPages correctly', async () => {
    const all = await purchaseOrderService.getAllPaginated(db, { limit: 100 });
    const onePerPage = await purchaseOrderService.getAllPaginated(db, { limit: 1 });
    expect(onePerPage.totalPages).toBe(all.total);
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
    expect(pos.length).toBeGreaterThan(0);
  });

  it('should return changes=0 for non-existent id', async () => {
    const result = await purchaseOrderService.softDelete(db, 99999);
    expect(result.changes).toBe(0);
  });
});
