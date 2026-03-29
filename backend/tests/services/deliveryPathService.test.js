const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const deliveryPathService = require('../../services/deliveryPathService');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('deliveryPathService', () => {
  describe('getAll', () => {
    it('should return non-deleted delivery paths', async () => {
      const paths = await deliveryPathService.getAll(db);
      expect(paths.length).toBeGreaterThanOrEqual(1);
      expect(paths[0].deliverypath_name).toBe('Agile');
    });

    it('should not return deleted delivery paths', async () => {
      const result = await deliveryPathService.create(db, {
        deliverypath_name: 'ToDeletePath',
        deilverypath_description: 'Will be deleted'
      });
      await deliveryPathService.softDelete(db, result.lastID);
      const paths = await deliveryPathService.getAll(db);
      const found = paths.find(p => p.deliverypath_name === 'ToDeletePath');
      expect(found).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('should return a delivery path by id', async () => {
      const path = await deliveryPathService.getById(db, 1);
      expect(path).not.toBeNull();
      expect(path.deliverypath_name).toBe('Agile');
      expect(path.deilverypath_description).toBe('Agile delivery');
    });

    it('should return null for non-existent id', async () => {
      const path = await deliveryPathService.getById(db, 9999);
      expect(path).toBeNull();
    });

    it('should return null for deleted delivery path', async () => {
      const result = await deliveryPathService.create(db, {
        deliverypath_name: 'DeletedPath',
        deilverypath_description: 'Gone'
      });
      await deliveryPathService.softDelete(db, result.lastID);
      const path = await deliveryPathService.getById(db, result.lastID);
      expect(path).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a delivery path with name and description', async () => {
      const result = await deliveryPathService.create(db, {
        deliverypath_name: 'Waterfall',
        deilverypath_description: 'Waterfall methodology'
      });
      expect(result.lastID).toBeGreaterThan(0);
      const created = await deliveryPathService.getById(db, result.lastID);
      expect(created.deliverypath_name).toBe('Waterfall');
      expect(created.deilverypath_description).toBe('Waterfall methodology');
    });

    it('should create a delivery path without description', async () => {
      const result = await deliveryPathService.create(db, {
        deliverypath_name: 'Kanban'
      });
      expect(result.lastID).toBeGreaterThan(0);
      const created = await deliveryPathService.getById(db, result.lastID);
      expect(created.deilverypath_description).toBeNull();
    });
  });

  describe('update', () => {
    it('should update delivery path name', async () => {
      const created = await deliveryPathService.create(db, {
        deliverypath_name: 'OldPath',
        deilverypath_description: 'Old desc'
      });
      const result = await deliveryPathService.update(db, created.lastID, {
        deliverypath_name: 'NewPath'
      });
      expect(result.changes).toBe(1);
      const updated = await deliveryPathService.getById(db, created.lastID);
      expect(updated.deliverypath_name).toBe('NewPath');
    });

    it('should update delivery path description (typo column)', async () => {
      const created = await deliveryPathService.create(db, {
        deliverypath_name: 'DescTestPath',
        deilverypath_description: 'Old'
      });
      await deliveryPathService.update(db, created.lastID, {
        deilverypath_description: 'New description'
      });
      const updated = await deliveryPathService.getById(db, created.lastID);
      expect(updated.deilverypath_description).toBe('New description');
    });

    it('should return 0 changes with empty data', async () => {
      const result = await deliveryPathService.update(db, 1, {});
      expect(result.changes).toBe(0);
    });

    it('should return 0 changes for non-existent id', async () => {
      const result = await deliveryPathService.update(db, 9999, { deliverypath_name: 'Nope' });
      expect(result.changes).toBe(0);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a delivery path', async () => {
      const created = await deliveryPathService.create(db, {
        deliverypath_name: 'WillBeDeletedPath',
        deilverypath_description: 'Bye'
      });
      const result = await deliveryPathService.softDelete(db, created.lastID);
      expect(result.changes).toBe(1);
      const path = await deliveryPathService.getById(db, created.lastID);
      expect(path).toBeNull();
    });
  });
});
