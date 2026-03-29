const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const divisionService = require('../../services/divisionService');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('divisionService', () => {
  describe('getAll', () => {
    it('should return non-deleted divisions', async () => {
      const divisions = await divisionService.getAll(db);
      expect(divisions.length).toBeGreaterThanOrEqual(1);
      expect(divisions[0].division_name).toBe('Engineering');
    });

    it('should not return deleted divisions', async () => {
      // Create and delete a division
      const result = await divisionService.create(db, { division_name: 'ToDelete' });
      await divisionService.softDelete(db, result.lastID);
      const divisions = await divisionService.getAll(db);
      const found = divisions.find(d => d.division_name === 'ToDelete');
      expect(found).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('should return a division by id', async () => {
      const division = await divisionService.getById(db, 1);
      expect(division).not.toBeNull();
      expect(division.division_name).toBe('Engineering');
    });

    it('should return null for non-existent id', async () => {
      const division = await divisionService.getById(db, 9999);
      expect(division).toBeNull();
    });

    it('should return null for deleted division', async () => {
      const result = await divisionService.create(db, { division_name: 'DeletedDiv' });
      await divisionService.softDelete(db, result.lastID);
      const division = await divisionService.getById(db, result.lastID);
      expect(division).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a division and return lastID', async () => {
      const result = await divisionService.create(db, { division_name: 'Marketing' });
      expect(result.lastID).toBeDefined();
      expect(result.lastID).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update a division name', async () => {
      const created = await divisionService.create(db, { division_name: 'OldName' });
      const result = await divisionService.update(db, created.lastID, { division_name: 'NewName' });
      expect(result.changes).toBe(1);
      const updated = await divisionService.getById(db, created.lastID);
      expect(updated.division_name).toBe('NewName');
    });

    it('should return 0 changes for non-existent id', async () => {
      const result = await divisionService.update(db, 9999, { division_name: 'Nope' });
      expect(result.changes).toBe(0);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a division', async () => {
      const created = await divisionService.create(db, { division_name: 'WillBeDeleted' });
      const result = await divisionService.softDelete(db, created.lastID);
      expect(result.changes).toBe(1);
      const division = await divisionService.getById(db, created.lastID);
      expect(division).toBeNull();
    });
  });
});
