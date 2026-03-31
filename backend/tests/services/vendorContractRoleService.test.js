const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const vendorContractRoleService = require('../../services/vendorContractRoleService');
const vendorContractService = require('../../services/vendorContractService');
const vendorService = require('../../services/vendorService');

let db;
let vendorId, contractId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  const vendorRes = await vendorService.create(db, {
    vendor_name: 'Test Vendor',
    vendor_email: 'vendor@test.com'
  });
  vendorId = vendorRes.lastID;

  const contractRes = await vendorContractService.create(db, {
    contract_name: 'Test Contract',
    contract_start_date: Date.now(),
    vendor_id: vendorId
  });
  contractId = contractRes.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('vendorContractRoleService.create', () => {
  it('creates a role with required fields only', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Consultant',
      vendorcontract_id: contractId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const role = await vendorContractRoleService.getById(db, result.lastID);
    expect(role).toBeDefined();
    expect(role.vendorcontractrole_name).toBe('Consultant');
    expect(role.vendorcontract_id).toBe(contractId);
  });

  it('creates a role with description', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Senior Consultant',
      vendorcontractrole_description: 'Leads technical projects and mentors junior staff',
      vendorcontract_id: contractId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const role = await vendorContractRoleService.getById(db, result.lastID);
    expect(role.vendorcontractrole_description).toBe('Leads technical projects and mentors junior staff');
  });

  it('stores nullable description as null when not provided', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Manager',
      vendorcontract_id: contractId
    });

    const role = await vendorContractRoleService.getById(db, result.lastID);
    expect(role.vendorcontractrole_description).toBeNull();
  });
});

describe('vendorContractRoleService.getByContractId', () => {
  it('returns all roles for a contract', async () => {
    await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Role A',
      vendorcontract_id: contractId
    });
    await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Role B',
      vendorcontract_id: contractId
    });

    const roles = await vendorContractRoleService.getByContractId(db, contractId);
    expect(roles.length).toBeGreaterThanOrEqual(2);
    const roleA = roles.find(r => r.vendorcontractrole_name === 'Role A');
    const roleB = roles.find(r => r.vendorcontractrole_name === 'Role B');
    expect(roleA).toBeDefined();
    expect(roleB).toBeDefined();
  });

  it('returns empty array for contract with no roles', async () => {
    const newContractRes = await vendorContractService.create(db, {
      contract_name: 'Empty Contract',
      contract_start_date: Date.now(),
      vendor_id: vendorId
    });

    const roles = await vendorContractRoleService.getByContractId(db, newContractRes.lastID);
    expect(roles.length).toBe(0);
  });

  it('does not return soft-deleted roles', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'To Delete',
      vendorcontract_id: contractId
    });
    const roleId = result.lastID;

    let roles = await vendorContractRoleService.getByContractId(db, contractId);
    const beforeDelete = roles.find(r => r.id === roleId);
    expect(beforeDelete).toBeDefined();

    await vendorContractRoleService.softDelete(db, roleId);

    roles = await vendorContractRoleService.getByContractId(db, contractId);
    const afterDelete = roles.find(r => r.id === roleId);
    expect(afterDelete).toBeUndefined();
  });
});

describe('vendorContractRoleService.getById', () => {
  it('returns a role by id', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Get by ID Role',
      vendorcontract_id: contractId
    });

    const role = await vendorContractRoleService.getById(db, result.lastID);
    expect(role).toBeDefined();
    expect(role.vendorcontractrole_name).toBe('Get by ID Role');
  });

  it('returns null for non-existent id', async () => {
    const role = await vendorContractRoleService.getById(db, 99999);
    expect(role).toBeNull();
  });

  it('returns null for soft-deleted role', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Will be deleted',
      vendorcontract_id: contractId
    });
    const roleId = result.lastID;

    await vendorContractRoleService.softDelete(db, roleId);
    const role = await vendorContractRoleService.getById(db, roleId);
    expect(role).toBeNull();
  });
});

describe('vendorContractRoleService.update', () => {
  it('updates role name', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Original Name',
      vendorcontract_id: contractId
    });

    await vendorContractRoleService.update(db, result.lastID, {
      vendorcontractrole_name: 'Updated Name'
    });

    const role = await vendorContractRoleService.getById(db, result.lastID);
    expect(role.vendorcontractrole_name).toBe('Updated Name');
  });

  it('updates description', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Role',
      vendorcontract_id: contractId
    });

    await vendorContractRoleService.update(db, result.lastID, {
      vendorcontractrole_description: 'New description'
    });

    const role = await vendorContractRoleService.getById(db, result.lastID);
    expect(role.vendorcontractrole_description).toBe('New description');
  });

  it('returns changes=0 when no updatable fields provided', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Role',
      vendorcontract_id: contractId
    });

    const updateResult = await vendorContractRoleService.update(db, result.lastID, {});
    expect(updateResult.changes).toBe(0);
  });

  it('returns changes=0 for non-existent id', async () => {
    const result = await vendorContractRoleService.update(db, 99999, {
      vendorcontractrole_name: 'Updated'
    });
    expect(result.changes).toBe(0);
  });

  it('updates vendorcontractrole_update_date', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Role',
      vendorcontract_id: contractId
    });

    const before = await vendorContractRoleService.getById(db, result.lastID);
    const beforeTime = before.vendorcontractrole_update_date;

    await new Promise(resolve => setTimeout(resolve, 10));

    await vendorContractRoleService.update(db, result.lastID, {
      vendorcontractrole_name: 'Updated'
    });

    const after = await vendorContractRoleService.getById(db, result.lastID);
    expect(after.vendorcontractrole_update_date).toBeGreaterThan(beforeTime || 0);
  });
});

describe('vendorContractRoleService.softDelete', () => {
  it('soft-deletes a role (changes=1)', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Role to delete',
      vendorcontract_id: contractId
    });

    const deleteResult = await vendorContractRoleService.softDelete(db, result.lastID);
    expect(deleteResult.changes).toBe(1);
  });

  it('soft-deleted role does not appear in getByContractId', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Delete test',
      vendorcontract_id: contractId
    });
    const roleId = result.lastID;

    await vendorContractRoleService.softDelete(db, roleId);
    const roles = await vendorContractRoleService.getByContractId(db, contractId);
    const found = roles.find(r => r.id === roleId);
    expect(found).toBeUndefined();
  });

  it('soft-deleted role returns null from getById', async () => {
    const result = await vendorContractRoleService.create(db, {
      vendorcontractrole_name: 'Role',
      vendorcontract_id: contractId
    });

    await vendorContractRoleService.softDelete(db, result.lastID);
    const role = await vendorContractRoleService.getById(db, result.lastID);
    expect(role).toBeNull();
  });

  it('returns changes=0 for non-existent id', async () => {
    const result = await vendorContractRoleService.softDelete(db, 99999);
    expect(result.changes).toBe(0);
  });
});
