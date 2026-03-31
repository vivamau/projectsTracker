const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const vendorRoleRateService = require('../../services/vendorRoleRateService');
const vendorContractRoleService = require('../../services/vendorContractRoleService');
const vendorContractService = require('../../services/vendorContractService');
const vendorService = require('../../services/vendorService');
const currencyService = require('../../services/currencyService');
const seniorityService = require('../../services/seniorityService');

let db;
let roleId, currencyId, seniorityId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  // Create vendor
  const vendorRes = await vendorService.create(db, {
    vendor_name: 'Test Vendor',
    vendor_email: 'vendor@test.com'
  });
  const vendorId = vendorRes.lastID;

  // Create contract
  const contractRes = await vendorContractService.create(db, {
    contract_name: 'Test Contract',
    contract_start_date: Date.now(),
    vendor_id: vendorId
  });
  const contractId = contractRes.lastID;

  // Create role
  const roleRes = await vendorContractRoleService.create(db, {
    vendorcontractrole_name: 'Test Role',
    vendorcontract_id: contractId
  });
  roleId = roleRes.lastID;

  // Create currency
  const currRes = await currencyService.create(db, {
    currency_name: 'USD',
    currency_code: 'USD',
    currency_symbol: '$'
  });
  currencyId = currRes.lastID;

  // Create seniority
  const senRes = await seniorityService.create(db, {
    seniority_description: 'Senior'
  });
  seniorityId = senRes.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('vendorRoleRateService.create', () => {
  it('creates a rate with required fields only', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 150,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const rate = await vendorRoleRateService.getById(db, result.lastID);
    expect(rate).toBeDefined();
    expect(rate.vendorrolerate_rate).toBe(150);
    expect(rate.currency_id).toBe(currencyId);
  });

  it('creates a rate with seniority and description', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 200,
      vendorrolerate_description: 'Senior consultant rate',
      vendorcontractrole_id: roleId,
      currency_id: currencyId,
      seniority_id: seniorityId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const rate = await vendorRoleRateService.getById(db, result.lastID);
    expect(rate.vendorrolerate_description).toBe('Senior consultant rate');
    expect(rate.seniority_id).toBe(seniorityId);
    expect(rate.seniority_description).toBe('Senior');
  });

  it('stores nullable fields as null when not provided', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 100,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });

    const rate = await vendorRoleRateService.getById(db, result.lastID);
    expect(rate.vendorrolerate_description).toBeNull();
    expect(rate.seniority_id).toBeNull();
  });
});

describe('vendorRoleRateService.getByRoleId', () => {
  it('returns all rates for a role', async () => {
    await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 150,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });
    await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 200,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });

    const rates = await vendorRoleRateService.getByRoleId(db, roleId);
    expect(rates.length).toBeGreaterThanOrEqual(2);
  });

  it('includes currency_name and seniority_description via JOINs', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 175,
      vendorcontractrole_id: roleId,
      currency_id: currencyId,
      seniority_id: seniorityId
    });

    const rates = await vendorRoleRateService.getByRoleId(db, roleId);
    const rate = rates.find(r => r.id === result.lastID);
    expect(rate.currency_name).toBe('USD');
    expect(rate.seniority_description).toBe('Senior');
  });

  it('does not return soft-deleted rates', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 125,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });
    const rateId = result.lastID;

    let rates = await vendorRoleRateService.getByRoleId(db, roleId);
    const beforeDelete = rates.find(r => r.id === rateId);
    expect(beforeDelete).toBeDefined();

    await vendorRoleRateService.softDelete(db, rateId);

    rates = await vendorRoleRateService.getByRoleId(db, roleId);
    const afterDelete = rates.find(r => r.id === rateId);
    expect(afterDelete).toBeUndefined();
  });
});

describe('vendorRoleRateService.getById', () => {
  it('returns a rate by id with joins', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 180,
      vendorcontractrole_id: roleId,
      currency_id: currencyId,
      seniority_id: seniorityId
    });

    const rate = await vendorRoleRateService.getById(db, result.lastID);
    expect(rate).toBeDefined();
    expect(rate.vendorrolerate_rate).toBe(180);
    expect(rate.currency_name).toBe('USD');
    expect(rate.seniority_description).toBe('Senior');
  });

  it('returns null for non-existent id', async () => {
    const rate = await vendorRoleRateService.getById(db, 99999);
    expect(rate).toBeNull();
  });

  it('returns null for soft-deleted rate', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 190,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });
    const rateId = result.lastID;

    await vendorRoleRateService.softDelete(db, rateId);
    const rate = await vendorRoleRateService.getById(db, rateId);
    expect(rate).toBeNull();
  });
});

describe('vendorRoleRateService.update', () => {
  it('updates rate amount', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 100,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });

    await vendorRoleRateService.update(db, result.lastID, {
      vendorrolerate_rate: 250
    });

    const rate = await vendorRoleRateService.getById(db, result.lastID);
    expect(rate.vendorrolerate_rate).toBe(250);
  });

  it('updates description and seniority', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 100,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });

    await vendorRoleRateService.update(db, result.lastID, {
      vendorrolerate_description: 'New description',
      seniority_id: seniorityId
    });

    const rate = await vendorRoleRateService.getById(db, result.lastID);
    expect(rate.vendorrolerate_description).toBe('New description');
    expect(rate.seniority_id).toBe(seniorityId);
  });

  it('returns changes=0 when no updatable fields provided', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 100,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });

    const updateResult = await vendorRoleRateService.update(db, result.lastID, {});
    expect(updateResult.changes).toBe(0);
  });

  it('returns changes=0 for non-existent id', async () => {
    const result = await vendorRoleRateService.update(db, 99999, {
      vendorrolerate_rate: 100
    });
    expect(result.changes).toBe(0);
  });

  it('updates vendorrolerate_update_date', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 100,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });

    const before = await vendorRoleRateService.getById(db, result.lastID);
    const beforeTime = before.vendorrolerate_update_date;

    await new Promise(resolve => setTimeout(resolve, 10));

    await vendorRoleRateService.update(db, result.lastID, {
      vendorrolerate_rate: 150
    });

    const after = await vendorRoleRateService.getById(db, result.lastID);
    expect(after.vendorrolerate_update_date).toBeGreaterThan(beforeTime || 0);
  });
});

describe('vendorRoleRateService.softDelete', () => {
  it('soft-deletes a rate (changes=1)', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 100,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });

    const deleteResult = await vendorRoleRateService.softDelete(db, result.lastID);
    expect(deleteResult.changes).toBe(1);
  });

  it('soft-deleted rate does not appear in getByRoleId', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 100,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });
    const rateId = result.lastID;

    await vendorRoleRateService.softDelete(db, rateId);
    const rates = await vendorRoleRateService.getByRoleId(db, roleId);
    const found = rates.find(r => r.id === rateId);
    expect(found).toBeUndefined();
  });

  it('soft-deleted rate returns null from getById', async () => {
    const result = await vendorRoleRateService.create(db, {
      vendorrolerate_rate: 100,
      vendorcontractrole_id: roleId,
      currency_id: currencyId
    });

    await vendorRoleRateService.softDelete(db, result.lastID);
    const rate = await vendorRoleRateService.getById(db, result.lastID);
    expect(rate).toBeNull();
  });

  it('returns changes=0 for non-existent id', async () => {
    const result = await vendorRoleRateService.softDelete(db, 99999);
    expect(result.changes).toBe(0);
  });
});
