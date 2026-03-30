const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const focalPointService = require('../../services/focalPointService');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('focalPointService.getByDivisionId', () => {
  it('should return empty array for division with no focal points', async () => {
    const fps = await focalPointService.getByDivisionId(db, 1);
    expect(fps).toEqual([]);
  });
});

describe('focalPointService.create', () => {
  it('should add a focal point to a division', async () => {
    const result = await focalPointService.create(db, { division_id: 1, user_id: 1 });
    expect(result.lastID).toBeDefined();
    expect(result.changes).toBe(1);
  });

  it('should add another focal point to the same division', async () => {
    const result = await focalPointService.create(db, { division_id: 1, user_id: 2 });
    expect(result.lastID).toBeDefined();
  });
});

describe('focalPointService.getByDivisionId after create', () => {
  it('should return focal points with user info', async () => {
    const fps = await focalPointService.getByDivisionId(db, 1);
    expect(fps.length).toBe(2);
    expect(fps[0].user_name).toBeDefined();
    expect(fps[0].user_email).toBeDefined();
    expect(fps[0].division_id).toBe(1);
  });
});

describe('focalPointService.getById', () => {
  it('should return a focal point by id', async () => {
    const fp = await focalPointService.getById(db, 1);
    expect(fp).toBeDefined();
    expect(fp.user_id).toBe(1);
    expect(fp.division_id).toBe(1);
  });

  it('should return null for non-existent id', async () => {
    const fp = await focalPointService.getById(db, 99999);
    expect(fp).toBeNull();
  });
});

describe('focalPointService.remove', () => {
  it('should remove a focal point', async () => {
    const result = await focalPointService.remove(db, 1);
    expect(result.changes).toBe(1);
  });

  it('should return changes=0 for non-existent focal point', async () => {
    const result = await focalPointService.remove(db, 99999);
    expect(result.changes).toBe(0);
  });

  it('should have one less focal point after removal', async () => {
    const fps = await focalPointService.getByDivisionId(db, 1);
    expect(fps.length).toBe(1);
  });
});

describe('focalPointService.syncFocalPoints', () => {
  it('should sync focal points for a division', async () => {
    await focalPointService.syncFocalPoints(db, 1, [1, 3]);
    const fps = await focalPointService.getByDivisionId(db, 1);
    expect(fps.length).toBe(2);
    const userIds = fps.map(fp => fp.user_id).sort();
    expect(userIds).toEqual([1, 3]);
  });

  it('should replace focal points when syncing', async () => {
    await focalPointService.syncFocalPoints(db, 1, [2]);
    const fps = await focalPointService.getByDivisionId(db, 1);
    expect(fps.length).toBe(1);
    expect(fps[0].user_id).toBe(2);
  });

  it('should clear all focal points with empty array', async () => {
    await focalPointService.syncFocalPoints(db, 1, []);
    const fps = await focalPointService.getByDivisionId(db, 1);
    expect(fps.length).toBe(0);
  });
});
