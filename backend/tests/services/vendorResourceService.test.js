const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const vendorResourceService = require('../../services/vendorResourceService');
const vendorService = require('../../services/vendorService');
const budgetService = require('../../services/budgetService');
const currencyService = require('../../services/currencyService');
const purchaseOrderService = require('../../services/purchaseOrderService');
const purchaseOrderItemService = require('../../services/purchaseOrderItemService');
const projectService = require('../../services/projectService');
const { runQuery } = require('../../config/database');

let db;
let vendorId, resourceId, budgetId, projectId, poId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  const vendorRes = await vendorService.create(db, { vendor_name: 'Resource Vendor' });
  vendorId = vendorRes.lastID;

  await runQuery(db,
    `INSERT INTO vendorresources (vendorresource_name, vendorresource_lastname, vendorresource_email, vendorresource_phone, vendor_id, vendorresource_create_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['Alice', 'Smith', 'alice@test.com', '+1-555-0100', vendorId, Date.now()]
  );
  const resRows = await new Promise((resolve, reject) => {
    db.all('SELECT id FROM vendorresources WHERE vendor_id = ?', [vendorId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  resourceId = resRows[0].id;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('vendorResourceService.getById', () => {
  it('should return a resource by id', async () => {
    const resource = await vendorResourceService.getById(db, resourceId);
    expect(resource).toBeDefined();
    expect(resource.vendorresource_name).toBe('Alice');
    expect(resource.vendorresource_lastname).toBe('Smith');
    expect(resource.vendorresource_email).toBe('alice@test.com');
    expect(resource.vendorresource_phone).toBe('+1-555-0100');
    expect(resource.vendor_id).toBe(vendorId);
  });

  it('should return null for non-existent id', async () => {
    const resource = await vendorResourceService.getById(db, 99999);
    expect(resource).toBeNull();
  });
});

describe('vendorResourceService.getProjects', () => {
  it('should return empty array when resource has no PO items', async () => {
    const projects = await vendorResourceService.getProjects(db, resourceId);
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBe(0);
  });

  it('should return projects linked via PO items', async () => {
    const projectRes = await projectService.create(db, {
      project_name: 'Resource Project',
      division_id: 1
    });
    projectId = projectRes.lastID;

    const currRes = await currencyService.create(db, { currency_name: 'EUR' });
    const currId = currRes.lastID;

    const budgetRes = await budgetService.create(db, {
      budget_amount: 5000,
      currency_id: currId,
      budget_start_date: Date.now()
    });
    budgetId = budgetRes.lastID;
    await budgetService.linkToProject(db, projectId, budgetId);

    const poRes = await purchaseOrderService.create(db, {
      purchaseorder_description: 'PO for resource',
      purchaseorder_start_date: Date.now(),
      budget_id: budgetId,
      vendor_id: vendorId
    });
    poId = poRes.lastID;

    await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Item assigned to resource',
      purchaseorderitem_start_date: Date.now(),
      purchaseorder_id: poId,
      vendorresource_id: resourceId
    });

    const projects = await vendorResourceService.getProjects(db, resourceId);
    expect(projects.length).toBe(1);
    expect(projects[0].project_name).toBe('Resource Project');
    expect(projects[0].project_id).toBe(projectId);
  });

  it('should not duplicate projects when resource has multiple PO items', async () => {
    await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Second item',
      purchaseorderitem_start_date: Date.now(),
      purchaseorder_id: poId,
      vendorresource_id: resourceId
    });

    const projects = await vendorResourceService.getProjects(db, resourceId);
    expect(projects.length).toBe(1);
  });

  it('should return project with expected fields', async () => {
    const projects = await vendorResourceService.getProjects(db, resourceId);
    const p = projects[0];
    expect(p.project_id).toBeDefined();
    expect(p.project_name).toBeDefined();
    expect(p.project_description).toBeDefined();
    expect(p.project_start_date).toBeDefined();
    expect(p.project_end_date).toBeDefined();
    expect(p.division_name).toBeDefined();
    expect(p.po_description).toBeDefined();
    expect(p.item_count).toBeDefined();
    expect(p.item_count).toBe(2);
  });
});

describe('vendorResourceService.getByProjectId', () => {
  it('should return empty array for project with no vendor resources', async () => {
    const emptyProjectRes = await projectService.create(db, {
      project_name: 'Empty Project'
    });
    const resources = await vendorResourceService.getByProjectId(db, emptyProjectRes.lastID);
    expect(Array.isArray(resources)).toBe(true);
    expect(resources.length).toBe(0);
  });

  it('should return vendor resources linked to a project via PO items', async () => {
    const resources = await vendorResourceService.getByProjectId(db, projectId);
    expect(resources.length).toBeGreaterThanOrEqual(1);
    const r = resources.find(res => res.vendorresource_id === resourceId);
    expect(r).toBeDefined();
    expect(r.vendorresource_name).toBe('Alice');
    expect(r.vendorresource_lastname).toBe('Smith');
    expect(r.vendor_name).toBe('Resource Vendor');
    expect(r.vendor_id).toBe(vendorId);
  });

  it('should include vendor contract role when assigned', async () => {
    const { runQuery } = require('../../config/database');
    const vcRes = await runQuery(db,
      `INSERT INTO vendorcontracts (contract_name, contract_start_date, vendor_id, contract_create_date, contract_update_date)
       VALUES (?, ?, ?, ?, ?)`,
      ['Test Contract', Date.now(), vendorId, Date.now(), Date.now()]
    );
    const vcrRes = await runQuery(db,
      `INSERT INTO vendorcontractroles (vendorcontractrole_name, vendorcontractrole_description, vendorcontract_id, vendorcontractrole_create_date, vendorcontractrole_update_date)
       VALUES (?, ?, ?, ?, ?)`,
      ['Developer', 'Backend developer', vcRes.lastID, Date.now(), Date.now()]
    );

    await runQuery(db,
      `INSERT INTO purchaseorderitems (purchaseorderitem_description, purchaseorderitem_start_date, purchaseorderitem_create_date, purchaseorderitem_update_date, purchaseorder_id, vendorresource_id, vendorcontractrole_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Item with role', Date.now(), Date.now(), Date.now(), poId, resourceId, vcrRes.lastID]
    );

    const resources = await vendorResourceService.getByProjectId(db, projectId);
    const withRole = resources.find(r => r.vendorcontractrole_name === 'Developer');
    expect(withRole).toBeDefined();
    expect(withRole.vendorcontractrole_id).toBe(vcrRes.lastID);
  });

  it('should not duplicate resources when resource has multiple PO items', async () => {
    const resources = await vendorResourceService.getByProjectId(db, projectId);
    const aliceResources = resources.filter(r => r.vendorresource_id === resourceId);
    expect(aliceResources.length).toBe(1);
  });

  it('should return resources with expected fields', async () => {
    const resources = await vendorResourceService.getByProjectId(db, projectId);
    const r = resources[0];
    expect(r.vendorresource_id).toBeDefined();
    expect(r.vendorresource_name).toBeDefined();
    expect(r.vendorresource_lastname).toBeDefined();
    expect(r.vendor_name).toBeDefined();
    expect(r.vendor_id).toBeDefined();
  });
});
