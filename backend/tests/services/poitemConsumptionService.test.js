const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const poitemConsumptionService = require('../../services/poitemConsumptionService');
const purchaseOrderItemService = require('../../services/purchaseOrderItemService');
const purchaseOrderService = require('../../services/purchaseOrderService');
const budgetService = require('../../services/budgetService');
const currencyService = require('../../services/currencyService');
const vendorService = require('../../services/vendorService');
const projectService = require('../../services/projectService');

let db;
let budgetId, poId, itemId, currencyId, vendorId, userId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  userId = 2;

  const projectRes = await projectService.create(db, {
    project_name: 'Consumption Test Project',
    division_id: 1,
    project_description: 'Test'
  });
  const projectId = projectRes.lastID;

  const currRes = await currencyService.create(db, {
    currency_name: 'USD',
    currency_code: 'USD',
    currency_symbol: '$'
  });
  currencyId = currRes.lastID;

  const vendorRes = await vendorService.create(db, {
    vendor_name: 'Test Vendor',
    vendor_email: 'vendor@test.com'
  });
  vendorId = vendorRes.lastID;

  const budgetRes = await budgetService.create(db, {
    budget_name: 'Test Budget',
    budget_amount: 100000,
    budget_start_date: Date.now(),
    currency_id: currencyId
  });
  budgetId = budgetRes.lastID;
  await budgetService.linkToProject(db, projectId, budgetId);

  const poRes = await purchaseOrderService.create(db, {
    purchaseorder_description: 'Test PO',
    purchaseorder_start_date: Date.now(),
    budget_id: budgetId,
    vendor_id: vendorId
  });
  poId = poRes.lastID;

  const itemRes = await purchaseOrderItemService.create(db, {
    purchaseorderitem_description: 'Test Item',
    purchaseorderitem_start_date: Date.now(),
    purchaseorderitems_days: 20,
    purchaseorder_id: poId,
    currency_id: currencyId
  });
  itemId = itemRes.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

function monthEpoch(year, month) {
  return new Date(year, month, 1).getTime();
}

describe('poitemConsumptionService.create', () => {
  it('creates a consumption entry', async () => {
    const month = monthEpoch(2026, 0);
    const result = await poitemConsumptionService.create(db, {
      purchaseorderitem_id: itemId,
      consumption_month: month,
      consumption_days: 12.5,
      consumption_comment: 'January report',
      user_id: userId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const entry = await poitemConsumptionService.getById(db, result.lastID);
    expect(entry.consumption_days).toBe(12.5);
    expect(entry.consumption_comment).toBe('January report');
    expect(entry.purchaseorderitem_id).toBe(itemId);
    expect(entry.user_id).toBe(userId);
  });

  it('rejects duplicate month for the same item', async () => {
    const month = monthEpoch(2026, 0);
    await expect(
      poitemConsumptionService.create(db, {
        purchaseorderitem_id: itemId,
        consumption_month: month,
        consumption_days: 5,
        user_id: userId
      })
    ).rejects.toThrow();
  });

  it('allows same month for different items', async () => {
    const item2Res = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item 2',
      purchaseorderitem_start_date: Date.now(),
      purchaseorderitems_days: 10,
      purchaseorder_id: poId
    });
    const month = monthEpoch(2026, 0);
    const result = await poitemConsumptionService.create(db, {
      purchaseorderitem_id: item2Res.lastID,
      consumption_month: month,
      consumption_days: 3,
      user_id: userId
    });
    expect(result.lastID).toBeGreaterThan(0);
  });

  it('supports half-day values (0.5)', async () => {
    const month = monthEpoch(2026, 1);
    const result = await poitemConsumptionService.create(db, {
      purchaseorderitem_id: itemId,
      consumption_month: month,
      consumption_days: 0.5,
      user_id: userId
    });
    const entry = await poitemConsumptionService.getById(db, result.lastID);
    expect(entry.consumption_days).toBe(0.5);
  });
});

describe('poitemConsumptionService.getByItemId', () => {
  it('returns all consumption entries for an item sorted by month desc', async () => {
    const entries = await poitemConsumptionService.getByItemId(db, itemId);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].consumption_month).toBeLessThanOrEqual(entries[i - 1].consumption_month);
    }
  });

  it('returns empty array for item with no consumptions', async () => {
    const itemRes = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Empty Item',
      purchaseorderitem_start_date: Date.now(),
      purchaseorder_id: poId
    });
    const entries = await poitemConsumptionService.getByItemId(db, itemRes.lastID);
    expect(entries).toEqual([]);
  });

  it('excludes soft-deleted entries', async () => {
    const month = monthEpoch(2026, 2);
    const result = await poitemConsumptionService.create(db, {
      purchaseorderitem_id: itemId,
      consumption_month: month,
      consumption_days: 5,
      user_id: userId
    });
    await poitemConsumptionService.softDelete(db, result.lastID);

    const entries = await poitemConsumptionService.getByItemId(db, itemId);
    const found = entries.find(e => e.id === result.lastID);
    expect(found).toBeUndefined();
  });
});

describe('poitemConsumptionService.getByItemIdWithSummary', () => {
  it('returns entries and computed summary', async () => {
    const summary = await poitemConsumptionService.getByItemIdWithSummary(db, itemId);
    expect(summary.entries).toBeDefined();
    expect(summary.total_days_used).toBeDefined();
    expect(summary.allocated_days).toBe(20);
    expect(summary.utilization_pct).toBeDefined();
    expect(typeof summary.utilization_pct).toBe('number');
  });

  it('calculates correct total and utilization', async () => {
    const itemRes = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Summary Item',
      purchaseorderitem_start_date: Date.now(),
      purchaseorderitems_days: 10,
      purchaseorder_id: poId
    });
    const newItemId = itemRes.lastID;

    await poitemConsumptionService.create(db, {
      purchaseorderitem_id: newItemId,
      consumption_month: monthEpoch(2026, 3),
      consumption_days: 3.5,
      user_id: userId
    });
    await poitemConsumptionService.create(db, {
      purchaseorderitem_id: newItemId,
      consumption_month: monthEpoch(2026, 4),
      consumption_days: 4.5,
      user_id: userId
    });

    const summary = await poitemConsumptionService.getByItemIdWithSummary(db, newItemId);
    expect(summary.total_days_used).toBe(8);
    expect(summary.allocated_days).toBe(10);
    expect(summary.utilization_pct).toBe(80);
  });

  it('returns 0 utilization when no allocated days', async () => {
    const itemRes = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'No Days Item',
      purchaseorderitem_start_date: Date.now(),
      purchaseorder_id: poId
    });

    await poitemConsumptionService.create(db, {
      purchaseorderitem_id: itemRes.lastID,
      consumption_month: monthEpoch(2026, 5),
      consumption_days: 5,
      user_id: userId
    });

    const summary = await poitemConsumptionService.getByItemIdWithSummary(db, itemRes.lastID);
    expect(summary.allocated_days).toBeNull();
    expect(summary.total_days_used).toBe(5);
    expect(summary.utilization_pct).toBeNull();
  });

  it('caps utilization at over 100% when over-consumed', async () => {
    const itemRes = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Over Item',
      purchaseorderitem_start_date: Date.now(),
      purchaseorderitems_days: 5,
      purchaseorder_id: poId
    });

    await poitemConsumptionService.create(db, {
      purchaseorderitem_id: itemRes.lastID,
      consumption_month: monthEpoch(2026, 6),
      consumption_days: 8,
      user_id: userId
    });

    const summary = await poitemConsumptionService.getByItemIdWithSummary(db, itemRes.lastID);
    expect(summary.utilization_pct).toBe(160);
  });
});

describe('poitemConsumptionService.update', () => {
  it('updates consumption_days and comment', async () => {
    const month = monthEpoch(2026, 7);
    const result = await poitemConsumptionService.create(db, {
      purchaseorderitem_id: itemId,
      consumption_month: month,
      consumption_days: 5,
      consumption_comment: 'Original',
      user_id: userId
    });

    await poitemConsumptionService.update(db, result.lastID, {
      consumption_days: 7.5,
      consumption_comment: 'Corrected'
    });

    const entry = await poitemConsumptionService.getById(db, result.lastID);
    expect(entry.consumption_days).toBe(7.5);
    expect(entry.consumption_comment).toBe('Corrected');
  });

  it('returns changes=0 for non-existent id', async () => {
    const result = await poitemConsumptionService.update(db, 99999, {
      consumption_days: 1
    });
    expect(result.changes).toBe(0);
  });

  it('returns changes=0 when no updatable fields provided', async () => {
    const month = monthEpoch(2026, 8);
    const result = await poitemConsumptionService.create(db, {
      purchaseorderitem_id: itemId,
      consumption_month: month,
      consumption_days: 2,
      user_id: userId
    });

    const updateResult = await poitemConsumptionService.update(db, result.lastID, {});
    expect(updateResult.changes).toBe(0);
  });
});

describe('poitemConsumptionService.softDelete', () => {
  it('soft-deletes a consumption entry', async () => {
    const month = monthEpoch(2026, 9);
    const result = await poitemConsumptionService.create(db, {
      purchaseorderitem_id: itemId,
      consumption_month: month,
      consumption_days: 1,
      user_id: userId
    });

    const deleteResult = await poitemConsumptionService.softDelete(db, result.lastID);
    expect(deleteResult.changes).toBe(1);

    const entry = await poitemConsumptionService.getById(db, result.lastID);
    expect(entry).toBeNull();
  });

  it('returns changes=0 for non-existent id', async () => {
    const result = await poitemConsumptionService.softDelete(db, 99999);
    expect(result.changes).toBe(0);
  });
});
