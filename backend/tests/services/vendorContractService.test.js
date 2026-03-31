const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const vendorContractService = require('../../services/vendorContractService');
const vendorService = require('../../services/vendorService');

let db;
let vendorId;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  const vendorRes = await vendorService.create(db, {
    vendor_name: 'Test Vendor',
    vendor_email: 'vendor@test.com'
  });
  vendorId = vendorRes.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('vendorContractService.create', () => {
  it('creates a contract with required fields only', async () => {
    const startDate = Date.now();
    const result = await vendorContractService.create(db, {
      contract_name: 'Test Contract',
      contract_start_date: startDate,
      vendor_id: vendorId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const contract = await vendorContractService.getById(db, result.lastID);
    expect(contract).toBeDefined();
    expect(contract.contract_name).toBe('Test Contract');
    expect(contract.contract_start_date).toBe(startDate);
    expect(contract.vendor_id).toBe(vendorId);
  });

  it('creates a contract with all fields', async () => {
    const startDate = Date.now();
    const endDate = startDate + 86400000 * 365;
    const result = await vendorContractService.create(db, {
      contract_name: 'Full Contract',
      contract_document_path: '/documents/contract.pdf',
      contract_start_date: startDate,
      contract_end_date: endDate,
      vendor_id: vendorId
    });
    expect(result.lastID).toBeGreaterThan(0);

    const contract = await vendorContractService.getById(db, result.lastID);
    expect(contract.contract_document_path).toBe('/documents/contract.pdf');
    expect(contract.contract_end_date).toBe(endDate);
  });

  it('stores nullable fields as null when not provided', async () => {
    const startDate = Date.now();
    const result = await vendorContractService.create(db, {
      contract_name: 'Contract No Path',
      contract_start_date: startDate,
      vendor_id: vendorId
    });

    const contract = await vendorContractService.getById(db, result.lastID);
    expect(contract.contract_document_path).toBeNull();
    expect(contract.contract_end_date).toBeNull();
  });
});

describe('vendorContractService.getByVendorId', () => {
  it('returns all contracts for a vendor', async () => {
    const startDate = Date.now();
    await vendorContractService.create(db, {
      contract_name: 'Contract A',
      contract_start_date: startDate,
      vendor_id: vendorId
    });
    await vendorContractService.create(db, {
      contract_name: 'Contract B',
      contract_start_date: startDate,
      vendor_id: vendorId
    });

    const contracts = await vendorContractService.getByVendorId(db, vendorId);
    expect(contracts.length).toBeGreaterThanOrEqual(2);
    const contractA = contracts.find(c => c.contract_name === 'Contract A');
    const contractB = contracts.find(c => c.contract_name === 'Contract B');
    expect(contractA).toBeDefined();
    expect(contractB).toBeDefined();
  });

  it('returns empty array for vendor with no contracts', async () => {
    const newVendorRes = await vendorService.create(db, {
      vendor_name: 'Vendor No Contracts',
      vendor_email: 'empty@test.com'
    });

    const contracts = await vendorContractService.getByVendorId(db, newVendorRes.lastID);
    expect(contracts.length).toBe(0);
  });

  it('does not return soft-deleted contracts', async () => {
    const startDate = Date.now();
    const result = await vendorContractService.create(db, {
      contract_name: 'To Delete Contract',
      contract_start_date: startDate,
      vendor_id: vendorId
    });
    const contractId = result.lastID;

    let contracts = await vendorContractService.getByVendorId(db, vendorId);
    const beforeDelete = contracts.find(c => c.id === contractId);
    expect(beforeDelete).toBeDefined();

    await vendorContractService.softDelete(db, contractId);

    contracts = await vendorContractService.getByVendorId(db, vendorId);
    const afterDelete = contracts.find(c => c.id === contractId);
    expect(afterDelete).toBeUndefined();
  });
});

describe('vendorContractService.getById', () => {
  it('returns a contract by id', async () => {
    const startDate = Date.now();
    const result = await vendorContractService.create(db, {
      contract_name: 'Get by ID Contract',
      contract_start_date: startDate,
      vendor_id: vendorId
    });

    const contract = await vendorContractService.getById(db, result.lastID);
    expect(contract).toBeDefined();
    expect(contract.contract_name).toBe('Get by ID Contract');
  });

  it('returns null for non-existent id', async () => {
    const contract = await vendorContractService.getById(db, 99999);
    expect(contract).toBeNull();
  });

  it('returns null for soft-deleted contract', async () => {
    const startDate = Date.now();
    const result = await vendorContractService.create(db, {
      contract_name: 'Will be deleted',
      contract_start_date: startDate,
      vendor_id: vendorId
    });
    const contractId = result.lastID;

    await vendorContractService.softDelete(db, contractId);
    const contract = await vendorContractService.getById(db, contractId);
    expect(contract).toBeNull();
  });
});

describe('vendorContractService.update', () => {
  it('updates contract name', async () => {
    const startDate = Date.now();
    const result = await vendorContractService.create(db, {
      contract_name: 'Original Name',
      contract_start_date: startDate,
      vendor_id: vendorId
    });

    await vendorContractService.update(db, result.lastID, {
      contract_name: 'Updated Name'
    });

    const contract = await vendorContractService.getById(db, result.lastID);
    expect(contract.contract_name).toBe('Updated Name');
  });

  it('updates document path', async () => {
    const startDate = Date.now();
    const result = await vendorContractService.create(db, {
      contract_name: 'Contract',
      contract_start_date: startDate,
      vendor_id: vendorId
    });

    await vendorContractService.update(db, result.lastID, {
      contract_document_path: '/new/path.pdf'
    });

    const contract = await vendorContractService.getById(db, result.lastID);
    expect(contract.contract_document_path).toBe('/new/path.pdf');
  });

  it('updates start and end dates', async () => {
    const startDate = Date.now();
    const newStartDate = startDate + 1000;
    const newEndDate = startDate + 86400000;
    const result = await vendorContractService.create(db, {
      contract_name: 'Contract',
      contract_start_date: startDate,
      vendor_id: vendorId
    });

    await vendorContractService.update(db, result.lastID, {
      contract_start_date: newStartDate,
      contract_end_date: newEndDate
    });

    const contract = await vendorContractService.getById(db, result.lastID);
    expect(contract.contract_start_date).toBe(newStartDate);
    expect(contract.contract_end_date).toBe(newEndDate);
  });

  it('returns changes=0 when no updatable fields provided', async () => {
    const startDate = Date.now();
    const result = await vendorContractService.create(db, {
      contract_name: 'Contract',
      contract_start_date: startDate,
      vendor_id: vendorId
    });

    const updateResult = await vendorContractService.update(db, result.lastID, {});
    expect(updateResult.changes).toBe(0);
  });

  it('returns changes=0 for non-existent id', async () => {
    const result = await vendorContractService.update(db, 99999, {
      contract_name: 'Updated'
    });
    expect(result.changes).toBe(0);
  });

  it('updates contract_update_date', async () => {
    const startDate = Date.now();
    const result = await vendorContractService.create(db, {
      contract_name: 'Contract',
      contract_start_date: startDate,
      vendor_id: vendorId
    });

    const before = await vendorContractService.getById(db, result.lastID);
    const beforeTime = before.contract_update_date;

    await new Promise(resolve => setTimeout(resolve, 10));

    await vendorContractService.update(db, result.lastID, {
      contract_name: 'Updated'
    });

    const after = await vendorContractService.getById(db, result.lastID);
    expect(after.contract_update_date).toBeGreaterThan(beforeTime || 0);
  });
});

describe('vendorContractService.softDelete', () => {
  it('soft-deletes a contract (changes=1)', async () => {
    const startDate = Date.now();
    const result = await vendorContractService.create(db, {
      contract_name: 'Contract to delete',
      contract_start_date: startDate,
      vendor_id: vendorId
    });

    const deleteResult = await vendorContractService.softDelete(db, result.lastID);
    expect(deleteResult.changes).toBe(1);
  });

  it('soft-deleted contract does not appear in getByVendorId', async () => {
    const startDate = Date.now();
    const result = await vendorContractService.create(db, {
      contract_name: 'Delete test',
      contract_start_date: startDate,
      vendor_id: vendorId
    });
    const contractId = result.lastID;

    await vendorContractService.softDelete(db, contractId);
    const contracts = await vendorContractService.getByVendorId(db, vendorId);
    const found = contracts.find(c => c.id === contractId);
    expect(found).toBeUndefined();
  });

  it('soft-deleted contract returns null from getById', async () => {
    const startDate = Date.now();
    const result = await vendorContractService.create(db, {
      contract_name: 'Contract',
      contract_start_date: startDate,
      vendor_id: vendorId
    });

    await vendorContractService.softDelete(db, result.lastID);
    const contract = await vendorContractService.getById(db, result.lastID);
    expect(contract).toBeNull();
  });

  it('returns changes=0 for non-existent id', async () => {
    const result = await vendorContractService.softDelete(db, 99999);
    expect(result.changes).toBe(0);
  });
});
