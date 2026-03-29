const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const budgetService = require('../../services/budgetService');
const { runQuery, getOne } = require('../../config/database');

let db;
let projectId;
let currencyId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  // Create a currency
  const curr = await runQuery(db,
    "INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)",
    ['USD', Date.now()]
  );
  currencyId = curr.lastID;

  // Create a test project
  const proj = await runQuery(db,
    "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
    ['Budget Project', Date.now(), 1]
  );
  projectId = proj.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('budgetService.create', () => {
  it('should create a budget', async () => {
    const result = await budgetService.create(db, {
      budget_amount: 50000,
      currency_id: currencyId,
      budget_start_date: Date.now(),
      budget_end_date: Date.now() + 86400000
    });

    expect(result.lastID).toBeDefined();
    expect(result.changes).toBe(1);
  });

  it('should create a budget without optional fields', async () => {
    const result = await budgetService.create(db, {
      budget_amount: 10000
    });

    expect(result.lastID).toBeDefined();
  });
});

describe('budgetService.getById', () => {
  let budgetId;

  beforeAll(async () => {
    const result = await budgetService.create(db, {
      budget_amount: 75000,
      currency_id: currencyId
    });
    budgetId = result.lastID;
  });

  it('should return a budget by id with currency name', async () => {
    const budget = await budgetService.getById(db, budgetId);

    expect(budget).toBeDefined();
    expect(budget.budget_amount).toBe(75000);
    expect(budget.currency_name).toBe('USD');
  });

  it('should return undefined for non-existent budget', async () => {
    const budget = await budgetService.getById(db, 99999);
    expect(budget).toBeFalsy();
  });

  it('should not return soft-deleted budget', async () => {
    const res = await budgetService.create(db, { budget_amount: 1000 });
    await budgetService.softDelete(db, res.lastID);
    const budget = await budgetService.getById(db, res.lastID);
    expect(budget).toBeFalsy();
  });
});

describe('budgetService.getByProjectId', () => {
  let testProjectId;

  beforeAll(async () => {
    const proj = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
      ['Multi-Budget Project', Date.now(), 1]
    );
    testProjectId = proj.lastID;

    // Create budgets and link them
    const b1 = await budgetService.create(db, { budget_amount: 20000, currency_id: currencyId });
    const b2 = await budgetService.create(db, { budget_amount: 35000, currency_id: currencyId });

    await budgetService.linkToProject(db, testProjectId, b1.lastID);
    await budgetService.linkToProject(db, testProjectId, b2.lastID);
  });

  it('should return all budgets for a project', async () => {
    const budgets = await budgetService.getByProjectId(db, testProjectId);

    expect(budgets.length).toBe(2);
    expect(budgets[0].currency_name).toBe('USD');
  });

  it('should not return soft-deleted budgets', async () => {
    const b3 = await budgetService.create(db, { budget_amount: 5000 });
    await budgetService.linkToProject(db, testProjectId, b3.lastID);
    await budgetService.softDelete(db, b3.lastID);

    const budgets = await budgetService.getByProjectId(db, testProjectId);
    const deleted = budgets.find(b => b.budget_amount === 5000);
    expect(deleted).toBeUndefined();
  });

  it('should return empty array for project with no budgets', async () => {
    const budgets = await budgetService.getByProjectId(db, 99999);
    expect(budgets).toEqual([]);
  });
});

describe('budgetService.update', () => {
  let budgetId;

  beforeAll(async () => {
    const res = await budgetService.create(db, { budget_amount: 40000, currency_id: currencyId });
    budgetId = res.lastID;
  });

  it('should update budget amount', async () => {
    const result = await budgetService.update(db, budgetId, { budget_amount: 55000 });
    expect(result.changes).toBe(1);

    const budget = await budgetService.getById(db, budgetId);
    expect(budget.budget_amount).toBe(55000);
  });

  it('should update multiple fields', async () => {
    const now = Date.now();
    const result = await budgetService.update(db, budgetId, {
      budget_amount: 60000,
      budget_approve_date: now,
      budget_start_date: now,
      budget_end_date: now + 86400000 * 30
    });
    expect(result.changes).toBe(1);
  });

  it('should return changes=0 for non-existent budget', async () => {
    const result = await budgetService.update(db, 99999, { budget_amount: 1 });
    expect(result.changes).toBe(0);
  });
});

describe('budgetService.softDelete', () => {
  it('should soft delete a budget', async () => {
    const res = await budgetService.create(db, { budget_amount: 9999 });
    const result = await budgetService.softDelete(db, res.lastID);
    expect(result.changes).toBe(1);
  });

  it('should not delete already deleted budget', async () => {
    const res = await budgetService.create(db, { budget_amount: 8888 });
    await budgetService.softDelete(db, res.lastID);
    const result = await budgetService.softDelete(db, res.lastID);
    expect(result.changes).toBe(0);
  });

  it('should return changes=0 for non-existent budget', async () => {
    const result = await budgetService.softDelete(db, 99999);
    expect(result.changes).toBe(0);
  });
});

describe('budgetService.linkToProject / unlinkFromProject', () => {
  let testProjectId, budgetId;

  beforeAll(async () => {
    const proj = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
      ['Link Project', Date.now(), 1]
    );
    testProjectId = proj.lastID;
    const b = await budgetService.create(db, { budget_amount: 15000 });
    budgetId = b.lastID;
  });

  it('should link a budget to a project', async () => {
    const result = await budgetService.linkToProject(db, testProjectId, budgetId);
    expect(result.lastID).toBeDefined();

    const budgets = await budgetService.getByProjectId(db, testProjectId);
    expect(budgets.length).toBe(1);
    expect(budgets[0].id).toBe(budgetId);
  });

  it('should unlink a budget from a project', async () => {
    const result = await budgetService.unlinkFromProject(db, testProjectId, budgetId);
    expect(result.changes).toBe(1);

    const budgets = await budgetService.getByProjectId(db, testProjectId);
    expect(budgets.length).toBe(0);
  });

  it('should return changes=0 when unlinking non-existent link', async () => {
    const result = await budgetService.unlinkFromProject(db, 99999, 99999);
    expect(result.changes).toBe(0);
  });
});

describe('budgetService.getTotalByProjectId', () => {
  let testProjectId;

  beforeAll(async () => {
    const proj = await runQuery(db,
      "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
      ['Total Budget Project', Date.now(), 1]
    );
    testProjectId = proj.lastID;

    const b1 = await budgetService.create(db, { budget_amount: 10000 });
    const b2 = await budgetService.create(db, { budget_amount: 25000 });
    await budgetService.linkToProject(db, testProjectId, b1.lastID);
    await budgetService.linkToProject(db, testProjectId, b2.lastID);
  });

  it('should return total budget for a project', async () => {
    const total = await budgetService.getTotalByProjectId(db, testProjectId);
    expect(total).toBe(35000);
  });

  it('should return 0 for project with no budgets', async () => {
    const total = await budgetService.getTotalByProjectId(db, 99999);
    expect(total).toBe(0);
  });
});
