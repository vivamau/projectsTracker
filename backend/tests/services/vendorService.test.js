const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const vendorService = require('../../services/vendorService');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('vendorService.create', () => {
  it('should create a vendor with required fields', async () => {
    const result = await vendorService.create(db, {
      vendor_name: 'Acme Corp',
      user_id: 1
    });
    expect(result.lastID).toBeDefined();
    expect(result.changes).toBe(1);
  });

  it('should create a vendor with all fields', async () => {
    const result = await vendorService.create(db, {
      vendor_name: 'TechVendor Inc',
      vendor_address: '123 Main St',
      vendor_phone: '+1-555-0100',
      vendor_email: 'contact@techvendor.com',
      vendor_website: 'https://techvendor.com',
      user_id: 2
    });
    expect(result.lastID).toBeDefined();
  });

  it('should create a third vendor', async () => {
    const result = await vendorService.create(db, {
      vendor_name: 'CloudServices Ltd'
    });
    expect(result.lastID).toBeDefined();
  });
});

describe('vendorService.getAll', () => {
  it('should return all vendors', async () => {
    const vendors = await vendorService.getAll(db);
    expect(vendors.length).toBe(3);
    expect(vendors[0].vendor_name).toBeDefined();
  });
});

describe('vendorService.getById', () => {
  it('should return a vendor by id', async () => {
    const vendor = await vendorService.getById(db, 1);
    expect(vendor).toBeDefined();
    expect(vendor.vendor_name).toBe('Acme Corp');
  });

  it('should return null for non-existent id', async () => {
    const vendor = await vendorService.getById(db, 99999);
    expect(vendor).toBeNull();
  });
});

describe('vendorService.update', () => {
  it('should update vendor name', async () => {
    const result = await vendorService.update(db, 1, { vendor_name: 'Acme Corporation' });
    expect(result.changes).toBe(1);

    const vendor = await vendorService.getById(db, 1);
    expect(vendor.vendor_name).toBe('Acme Corporation');
  });

  it('should update multiple fields', async () => {
    const result = await vendorService.update(db, 1, {
      vendor_email: 'info@acme.com',
      vendor_phone: '+1-555-0200'
    });
    expect(result.changes).toBe(1);
  });

  it('should return changes=0 when no fields provided', async () => {
    const result = await vendorService.update(db, 1, {});
    expect(result.changes).toBe(0);
  });
});

describe('vendorService.softDelete', () => {
  it('should soft delete a vendor', async () => {
    const result = await vendorService.softDelete(db, 3);
    expect(result.changes).toBe(1);
  });

  it('should not return soft-deleted vendor in getAll', async () => {
    const vendors = await vendorService.getAll(db);
    expect(vendors.length).toBe(2);
  });

  it('should not return soft-deleted vendor in getById', async () => {
    const vendor = await vendorService.getById(db, 3);
    expect(vendor).toBeNull();
  });

  it('should return changes=0 for non-existent id', async () => {
    const result = await vendorService.softDelete(db, 99999);
    expect(result.changes).toBe(0);
  });
});
