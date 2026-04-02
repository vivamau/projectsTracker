const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const purchaseOrderItemService = require('../../services/purchaseOrderItemService');
const poitemConsumptionService = require('../../services/poitemConsumptionService');
const budgetService = require('../../services/budgetService');
const currencyService = require('../../services/currencyService');
const purchaseOrderService = require('../../services/purchaseOrderService');
const projectService = require('../../services/projectService');
const vendorService = require('../../services/vendorService');

let db;
let budgetId, poId, currencyId, vendorId, vendorContractId, vendorRoleId, vendorRoleRateId, vendorResourceId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  // Create project
  const projectRes = await projectService.create(db, {
    project_name: 'Test Project',
    division_id: 1,
    project_description: 'Test'
  });
  const projectId = projectRes.lastID;

  // Create currency
  const currRes = await currencyService.create(db, {
    currency_name: 'USD',
    currency_code: 'USD',
    currency_symbol: '$'
  });
  currencyId = currRes.lastID;

  // Create vendor
  const vendorRes = await vendorService.create(db, {
    vendor_name: 'Test Vendor',
    vendor_email: 'vendor@test.com'
  });
  vendorId = vendorRes.lastID;

  // Create vendor contract
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
  vendorContractId = contractRes.lastID;

  // Create vendor contract role
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
  vendorRoleId = roleRes.lastID;

  // Create vendor role rate
  const rateRes = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO vendorrolerates (vendorrolerate_rate, vendorcontractrole_id, currency_id, vendorrolerate_create_date)
       VALUES (?, ?, ?, ?)`,
      [150.00, vendorRoleId, currencyId, Date.now()],
      function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID });
      }
    );
  });
  vendorRoleRateId = rateRes.lastID;

  // Create vendor resource
  const resourceRes = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO vendorresources (vendorresource_name, vendorresource_lastname, vendor_id, vendorresource_create_date)
       VALUES (?, ?, ?, ?)`,
      ['John', 'Doe', vendorId, Date.now()],
      function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID });
      }
    );
  });
  vendorResourceId = resourceRes.lastID;

  // Create budget
  const budgetRes = await budgetService.create(db, {
    budget_name: 'Test Budget',
    budget_amount: 1000,
    budget_start_date: Date.now(),
    currency_id: currencyId
  });
  budgetId = budgetRes.lastID;

  // Link budget to project
  await budgetService.linkToProject(db, projectId, budgetId);

  // Create purchase order
  const poRes = await purchaseOrderService.create(db, {
    purchaseorder_description: 'Test PO',
    purchaseorder_start_date: Date.now(),
    budget_id: budgetId,
    vendor_id: vendorId
  });
  poId = poRes.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('purchaseOrderItemService.create', () => {
  it('creates an item with required fields only', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item 1',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item).toBeDefined();
    expect(item.purchaseorderitem_description).toBe('Item 1');
    expect(item.purchaseorderitem_start_date).toBe(startDate);
    expect(item.purchaseorder_id).toBe(poId);
  });

  it('creates an item with all optional fields', async () => {
    const startDate = Date.now();
    const endDate = startDate + 86400000;
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item 2',
      purchaseorderitem_start_date: startDate,
      purchaseorderitem_end_date: endDate,
      purchaseorderitems_days: 5,
      purchaseorderitems_discounted_rate: 1500.50,
      purchaseorder_id: poId,
      currency_id: currencyId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.purchaseorderitem_end_date).toBe(endDate);
    expect(item.purchaseorderitems_days).toBe(5);
    expect(item.purchaseorderitems_discounted_rate).toBe(1500.50);
    expect(item.currency_id).toBe(currencyId);
  });

  it('creates an item with vendor contract role', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item with vendor role',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId,
      vendorcontractrole_id: vendorRoleId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.vendorcontractrole_id).toBe(vendorRoleId);
    expect(item.vendorcontractrole_name).toBe('Consultant');
  });

  it('creates an item with vendor role rate', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item with vendor rate',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId,
      vendorrolerate_id: vendorRoleRateId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.vendorrolerate_id).toBe(vendorRoleRateId);
  });

  it('creates an item with vendor resource', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item with vendor resource',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId,
      vendorresource_id: vendorResourceId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.vendorresource_id).toBe(vendorResourceId);
    expect(item.vendorresource_name).toBe('John');
    expect(item.vendorresource_lastname).toBe('Doe');
  });

  it('creates an item with all vendor fields', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item with all vendor info',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId,
      vendorcontractrole_id: vendorRoleId,
      vendorrolerate_id: vendorRoleRateId,
      vendorresource_id: vendorResourceId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.vendorcontractrole_id).toBe(vendorRoleId);
    expect(item.vendorcontractrole_name).toBe('Consultant');
    expect(item.vendorrolerate_id).toBe(vendorRoleRateId);
    expect(item.vendorresource_id).toBe(vendorResourceId);
  });

  it('stores nullable fields as null when not provided', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item 3',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.purchaseorderitem_end_date).toBeNull();
    expect(item.purchaseorderitems_days).toBeNull();
    expect(item.purchaseorderitems_discounted_rate).toBeNull();
    expect(item.currency_id).toBeNull();
  });
});

describe('purchaseOrderItemService.getByPoId', () => {
  it('returns all items for a purchase order', async () => {
    const startDate = Date.now();
    await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item A',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId,
      currency_id: currencyId
    });
    await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item B',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });

    const items = await purchaseOrderItemService.getByPoId(db, poId);
    expect(items.length).toBeGreaterThanOrEqual(2);
    const itemA = items.find(i => i.purchaseorderitem_description === 'Item A');
    const itemB = items.find(i => i.purchaseorderitem_description === 'Item B');
    expect(itemA).toBeDefined();
    expect(itemB).toBeDefined();
  });

  it('includes currency_name via LEFT JOIN', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item with Currency',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId,
      currency_id: currencyId
    });

    const items = await purchaseOrderItemService.getByPoId(db, poId);
    const item = items.find(i => i.id === result.lastID);
    expect(item.currency_name).toBe('USD');
  });

  it('returns empty array for PO with no items', async () => {
    // Create a new PO with no items
    const newPoRes = await purchaseOrderService.create(db, {
      purchaseorder_description: 'Empty PO',
      purchaseorder_start_date: Date.now(),
      budget_id: budgetId
    });

    const items = await purchaseOrderItemService.getByPoId(db, newPoRes.lastID);
    expect(items.length).toBe(0);
  });

  it('includes vendor resource name via LEFT JOIN in getByPoId', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item with resource in list',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId,
      vendorresource_id: vendorResourceId
    });

    const items = await purchaseOrderItemService.getByPoId(db, poId);
    const item = items.find(i => i.id === result.lastID);
    expect(item).toBeDefined();
    expect(item.vendorresource_id).toBe(vendorResourceId);
    expect(item.vendorresource_name).toBe('John');
    expect(item.vendorresource_lastname).toBe('Doe');
  });

  it('includes total_days_consumed (0 when no consumptions)', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item no consumption',
      purchaseorderitem_start_date: startDate,
      purchaseorderitems_days: 5,
      purchaseorder_id: poId
    });

    const items = await purchaseOrderItemService.getByPoId(db, poId);
    const item = items.find(i => i.id === result.lastID);
    expect(item).toBeDefined();
    expect(item.total_days_consumed).toBe(0);
  });

  it('includes total_days_consumed summed from consumptions', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item with consumption',
      purchaseorderitem_start_date: startDate,
      purchaseorderitems_days: 2,
      purchaseorder_id: poId
    });
    const itemId = result.lastID;

    await poitemConsumptionService.create(db, {
      purchaseorderitem_id: itemId,
      consumption_month: new Date(2025, 0, 1).getTime(),
      consumption_days: 0.5,
      consumption_comment: null,
      user_id: null
    });

    const items = await purchaseOrderItemService.getByPoId(db, poId);
    const item = items.find(i => i.id === itemId);
    expect(item).toBeDefined();
    expect(item.total_days_consumed).toBe(0.5);
  });

  it('does not return soft-deleted items', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item to delete',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });
    const itemId = result.lastID;

    // Verify it exists
    let items = await purchaseOrderItemService.getByPoId(db, poId);
    const beforeDelete = items.find(i => i.id === itemId);
    expect(beforeDelete).toBeDefined();

    // Soft delete
    await purchaseOrderItemService.softDelete(db, itemId);

    // Verify it's gone
    items = await purchaseOrderItemService.getByPoId(db, poId);
    const afterDelete = items.find(i => i.id === itemId);
    expect(afterDelete).toBeUndefined();
  });
});

describe('purchaseOrderItemService.getById', () => {
  it('returns an item by id with currency_name', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Fetch by ID',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId,
      currency_id: currencyId
    });

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item).toBeDefined();
    expect(item.purchaseorderitem_description).toBe('Fetch by ID');
    expect(item.currency_name).toBe('USD');
  });

  it('returns null for non-existent id', async () => {
    const item = await purchaseOrderItemService.getById(db, 99999);
    expect(item).toBeNull();
  });

  it('returns null for soft-deleted item', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Will be deleted',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });
    const itemId = result.lastID;

    await purchaseOrderItemService.softDelete(db, itemId);
    const item = await purchaseOrderItemService.getById(db, itemId);
    expect(item).toBeNull();
  });
});

describe('purchaseOrderItemService.update', () => {
  it('updates description', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Original',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });

    await purchaseOrderItemService.update(db, result.lastID, {
      purchaseorderitem_description: 'Updated'
    });

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.purchaseorderitem_description).toBe('Updated');
  });

  it('updates numeric fields (days, discounted_rate)', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId,
      purchaseorderitems_days: 1,
      purchaseorderitems_discounted_rate: 100
    });

    await purchaseOrderItemService.update(db, result.lastID, {
      purchaseorderitems_days: 10,
      purchaseorderitems_discounted_rate: 2000.75
    });

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.purchaseorderitems_days).toBe(10);
    expect(item.purchaseorderitems_discounted_rate).toBe(2000.75);
  });

  it('updates date fields', async () => {
    const startDate = Date.now();
    const newStartDate = startDate + 1000;
    const newEndDate = startDate + 86400000;
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });

    await purchaseOrderItemService.update(db, result.lastID, {
      purchaseorderitem_start_date: newStartDate,
      purchaseorderitem_end_date: newEndDate
    });

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.purchaseorderitem_start_date).toBe(newStartDate);
    expect(item.purchaseorderitem_end_date).toBe(newEndDate);
  });

  it('updates currency_id', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId,
      currency_id: currencyId
    });

    await purchaseOrderItemService.update(db, result.lastID, {
      currency_id: null
    });

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.currency_id).toBeNull();
  });

  it('updates vendorcontractrole_id', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });

    await purchaseOrderItemService.update(db, result.lastID, {
      vendorcontractrole_id: vendorRoleId
    });

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.vendorcontractrole_id).toBe(vendorRoleId);
    expect(item.vendorcontractrole_name).toBe('Consultant');
  });

  it('updates vendorrolerate_id', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });

    await purchaseOrderItemService.update(db, result.lastID, {
      vendorrolerate_id: vendorRoleRateId
    });

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.vendorrolerate_id).toBe(vendorRoleRateId);
  });

  it('updates vendorresource_id', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });

    await purchaseOrderItemService.update(db, result.lastID, {
      vendorresource_id: vendorResourceId
    });

    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item.vendorresource_id).toBe(vendorResourceId);
  });

  it('returns changes=0 when no updatable fields provided', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });

    const updateResult = await purchaseOrderItemService.update(db, result.lastID, {});
    expect(updateResult.changes).toBe(0);
  });

  it('returns changes=0 for non-existent id', async () => {
    const result = await purchaseOrderItemService.update(db, 99999, {
      purchaseorderitem_description: 'Updated'
    });
    expect(result.changes).toBe(0);
  });

  it('updates purchaseorderitem_update_date', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });

    const before = await purchaseOrderItemService.getById(db, result.lastID);
    const beforeTime = before.purchaseorderitem_update_date;

    // Wait a bit and update
    await new Promise(resolve => setTimeout(resolve, 10));

    await purchaseOrderItemService.update(db, result.lastID, {
      purchaseorderitem_description: 'Updated'
    });

    const after = await purchaseOrderItemService.getById(db, result.lastID);
    expect(after.purchaseorderitem_update_date).toBeGreaterThan(beforeTime || 0);
  });
});

describe('purchaseOrderItemService.softDelete', () => {
  it('soft-deletes an item (changes=1)', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item to delete',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });

    const deleteResult = await purchaseOrderItemService.softDelete(db, result.lastID);
    expect(deleteResult.changes).toBe(1);
  });

  it('soft-deleted item does not appear in getByPoId', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Delete test',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });
    const itemId = result.lastID;

    await purchaseOrderItemService.softDelete(db, itemId);
    const items = await purchaseOrderItemService.getByPoId(db, poId);
    const found = items.find(i => i.id === itemId);
    expect(found).toBeUndefined();
  });

  it('soft-deleted item returns null from getById', async () => {
    const startDate = Date.now();
    const result = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item',
      purchaseorderitem_start_date: startDate,
      purchaseorder_id: poId
    });

    await purchaseOrderItemService.softDelete(db, result.lastID);
    const item = await purchaseOrderItemService.getById(db, result.lastID);
    expect(item).toBeNull();
  });

  it('returns changes=0 for non-existent id', async () => {
    const result = await purchaseOrderItemService.softDelete(db, 99999);
    expect(result.changes).toBe(0);
  });
});
