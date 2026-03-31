const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const seniorityService = require('../../services/seniorityService');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('seniorityService.create', () => {
  it('creates a seniority level', async () => {
    const result = await seniorityService.create(db, {
      seniority_description: 'Junior'
    });
    expect(result.lastID).toBeGreaterThan(0);

    const seniority = await seniorityService.getById(db, result.lastID);
    expect(seniority).toBeDefined();
    expect(seniority.seniority_description).toBe('Junior');
  });
});

describe('seniorityService.getAll', () => {
  it('returns all seniority levels', async () => {
    await seniorityService.create(db, { seniority_description: 'Mid-Level' });
    await seniorityService.create(db, { seniority_description: 'Senior' });

    const seniorities = await seniorityService.getAll(db);
    expect(seniorities.length).toBeGreaterThanOrEqual(2);
  });

  it('does not return soft-deleted seniorities', async () => {
    const result = await seniorityService.create(db, {
      seniority_description: 'To Delete'
    });
    const seniorityId = result.lastID;

    let seniorities = await seniorityService.getAll(db);
    const beforeDelete = seniorities.find(s => s.id === seniorityId);
    expect(beforeDelete).toBeDefined();

    await seniorityService.softDelete(db, seniorityId);

    seniorities = await seniorityService.getAll(db);
    const afterDelete = seniorities.find(s => s.id === seniorityId);
    expect(afterDelete).toBeUndefined();
  });
});

describe('seniorityService.getById', () => {
  it('returns a seniority by id', async () => {
    const result = await seniorityService.create(db, {
      seniority_description: 'Lead'
    });

    const seniority = await seniorityService.getById(db, result.lastID);
    expect(seniority).toBeDefined();
    expect(seniority.seniority_description).toBe('Lead');
  });

  it('returns null for non-existent id', async () => {
    const seniority = await seniorityService.getById(db, 99999);
    expect(seniority).toBeNull();
  });

  it('returns null for soft-deleted seniority', async () => {
    const result = await seniorityService.create(db, {
      seniority_description: 'Will be deleted'
    });
    const seniorityId = result.lastID;

    await seniorityService.softDelete(db, seniorityId);
    const seniority = await seniorityService.getById(db, seniorityId);
    expect(seniority).toBeNull();
  });
});

describe('seniorityService.update', () => {
  it('updates seniority description', async () => {
    const result = await seniorityService.create(db, {
      seniority_description: 'Original'
    });

    await seniorityService.update(db, result.lastID, {
      seniority_description: 'Updated'
    });

    const seniority = await seniorityService.getById(db, result.lastID);
    expect(seniority.seniority_description).toBe('Updated');
  });

  it('returns changes=0 when no updatable fields provided', async () => {
    const result = await seniorityService.create(db, {
      seniority_description: 'Seniority'
    });

    const updateResult = await seniorityService.update(db, result.lastID, {});
    expect(updateResult.changes).toBe(0);
  });

  it('returns changes=0 for non-existent id', async () => {
    const result = await seniorityService.update(db, 99999, {
      seniority_description: 'Updated'
    });
    expect(result.changes).toBe(0);
  });

  it('updates seniority_update_date', async () => {
    const result = await seniorityService.create(db, {
      seniority_description: 'Seniority'
    });

    const before = await seniorityService.getById(db, result.lastID);
    const beforeTime = before.seniority_update_date;

    await new Promise(resolve => setTimeout(resolve, 10));

    await seniorityService.update(db, result.lastID, {
      seniority_description: 'Updated'
    });

    const after = await seniorityService.getById(db, result.lastID);
    expect(after.seniority_update_date).toBeGreaterThan(beforeTime || 0);
  });
});

describe('seniorityService.softDelete', () => {
  it('soft-deletes a seniority (changes=1)', async () => {
    const result = await seniorityService.create(db, {
      seniority_description: 'Seniority to delete'
    });

    const deleteResult = await seniorityService.softDelete(db, result.lastID);
    expect(deleteResult.changes).toBe(1);
  });

  it('soft-deleted seniority does not appear in getAll', async () => {
    const result = await seniorityService.create(db, {
      seniority_description: 'Delete test'
    });
    const seniorityId = result.lastID;

    await seniorityService.softDelete(db, seniorityId);
    const seniorities = await seniorityService.getAll(db);
    const found = seniorities.find(s => s.id === seniorityId);
    expect(found).toBeUndefined();
  });

  it('soft-deleted seniority returns null from getById', async () => {
    const result = await seniorityService.create(db, {
      seniority_description: 'Seniority'
    });

    await seniorityService.softDelete(db, result.lastID);
    const seniority = await seniorityService.getById(db, result.lastID);
    expect(seniority).toBeNull();
  });

  it('returns changes=0 for non-existent id', async () => {
    const result = await seniorityService.softDelete(db, 99999);
    expect(result.changes).toBe(0);
  });
});
