const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const initiativeService = require('../../services/initiativeService');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('initiativeService', () => {
  describe('getAll', () => {
    it('should return non-deleted initiatives', async () => {
      const initiatives = await initiativeService.getAll(db);
      expect(initiatives.length).toBeGreaterThanOrEqual(1);
      expect(initiatives[0].initiative_name).toBe('Digital Transformation');
    });

    it('should not return deleted initiatives', async () => {
      const result = await initiativeService.create(db, {
        initiative_name: 'ToDelete',
        initiative_description: 'Will be deleted'
      });
      await initiativeService.softDelete(db, result.lastID);
      const initiatives = await initiativeService.getAll(db);
      const found = initiatives.find(i => i.initiative_name === 'ToDelete');
      expect(found).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('should return an initiative by id', async () => {
      const initiative = await initiativeService.getById(db, 1);
      expect(initiative).not.toBeNull();
      expect(initiative.initiative_name).toBe('Digital Transformation');
    });

    it('should return null for non-existent id', async () => {
      const initiative = await initiativeService.getById(db, 9999);
      expect(initiative).toBeNull();
    });

    it('should return null for deleted initiative', async () => {
      const result = await initiativeService.create(db, {
        initiative_name: 'DeletedInit',
        initiative_description: 'Gone'
      });
      await initiativeService.softDelete(db, result.lastID);
      const initiative = await initiativeService.getById(db, result.lastID);
      expect(initiative).toBeNull();
    });
  });

  describe('create', () => {
    it('should create an initiative with name and description', async () => {
      const result = await initiativeService.create(db, {
        initiative_name: 'Cloud Migration',
        initiative_description: 'Move to cloud'
      });
      expect(result.lastID).toBeGreaterThan(0);
      const created = await initiativeService.getById(db, result.lastID);
      expect(created.initiative_name).toBe('Cloud Migration');
      expect(created.initiative_description).toBe('Move to cloud');
    });

    it('should create an initiative without description', async () => {
      const result = await initiativeService.create(db, {
        initiative_name: 'No Desc Initiative'
      });
      expect(result.lastID).toBeGreaterThan(0);
      const created = await initiativeService.getById(db, result.lastID);
      expect(created.initiative_description).toBeNull();
    });
  });

  describe('update', () => {
    it('should update initiative name', async () => {
      const created = await initiativeService.create(db, {
        initiative_name: 'OldInit',
        initiative_description: 'Old desc'
      });
      const result = await initiativeService.update(db, created.lastID, {
        initiative_name: 'NewInit'
      });
      expect(result.changes).toBe(1);
      const updated = await initiativeService.getById(db, created.lastID);
      expect(updated.initiative_name).toBe('NewInit');
    });

    it('should update initiative description', async () => {
      const created = await initiativeService.create(db, {
        initiative_name: 'DescTest',
        initiative_description: 'Old'
      });
      await initiativeService.update(db, created.lastID, {
        initiative_description: 'New description'
      });
      const updated = await initiativeService.getById(db, created.lastID);
      expect(updated.initiative_description).toBe('New description');
    });

    it('should return 0 changes with empty data', async () => {
      const result = await initiativeService.update(db, 1, {});
      expect(result.changes).toBe(0);
    });

    it('should return 0 changes for non-existent id', async () => {
      const result = await initiativeService.update(db, 9999, { initiative_name: 'Nope' });
      expect(result.changes).toBe(0);
    });
  });

  describe('softDelete', () => {
    it('should soft delete an initiative', async () => {
      const created = await initiativeService.create(db, {
        initiative_name: 'WillBeDeleted',
        initiative_description: 'Bye'
      });
      const result = await initiativeService.softDelete(db, created.lastID);
      expect(result.changes).toBe(1);
      const initiative = await initiativeService.getById(db, created.lastID);
      expect(initiative).toBeNull();
    });
  });
});
