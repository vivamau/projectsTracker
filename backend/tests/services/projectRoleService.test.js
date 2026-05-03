const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const projectRoleService = require('../../services/projectRoleService');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('projectRoleService', () => {
  describe('getAll', () => {
    it('should return seeded roles (Project Manager, Solution Architect)', async () => {
      const roles = await projectRoleService.getAll(db);
      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThanOrEqual(2);
      const names = roles.map(r => r.role_name);
      expect(names).toContain('Project Manager');
      expect(names).toContain('Solution Architect');
    });

    it('should not return soft-deleted roles', async () => {
      const created = await projectRoleService.create(db, { role_name: 'To Delete' });
      await projectRoleService.softDelete(db, created.lastID);
      const roles = await projectRoleService.getAll(db);
      const found = roles.find(r => r.id === created.lastID);
      expect(found).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('should return a role by id', async () => {
      const role = await projectRoleService.getById(db, 1);
      expect(role).not.toBeNull();
      expect(role.role_name).toBe('Project Manager');
    });

    it('should return null for non-existent id', async () => {
      const role = await projectRoleService.getById(db, 99999);
      expect(role).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new role', async () => {
      const result = await projectRoleService.create(db, {
        role_name: 'Product Owner',
        role_description: 'Owns the product backlog'
      });
      expect(result.lastID).toBeGreaterThan(0);
      const role = await projectRoleService.getById(db, result.lastID);
      expect(role.role_name).toBe('Product Owner');
      expect(role.role_description).toBe('Owns the product backlog');
    });

    it('should create a role without description', async () => {
      const result = await projectRoleService.create(db, { role_name: 'Service Designer' });
      expect(result.lastID).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update role name and description', async () => {
      const created = await projectRoleService.create(db, { role_name: 'Old Name' });
      await projectRoleService.update(db, created.lastID, {
        role_name: 'New Name',
        role_description: 'Updated desc'
      });
      const role = await projectRoleService.getById(db, created.lastID);
      expect(role.role_name).toBe('New Name');
      expect(role.role_description).toBe('Updated desc');
    });

    it('should update only role_name', async () => {
      const created = await projectRoleService.create(db, { role_name: 'OnlyNameOld' });
      await projectRoleService.update(db, created.lastID, { role_name: 'OnlyNameNew' });
      const role = await projectRoleService.getById(db, created.lastID);
      expect(role.role_name).toBe('OnlyNameNew');
    });

    it('should update only role_description', async () => {
      const created = await projectRoleService.create(db, { role_name: 'DescOnly', role_description: 'old' });
      await projectRoleService.update(db, created.lastID, { role_description: 'new desc' });
      const role = await projectRoleService.getById(db, created.lastID);
      expect(role.role_description).toBe('new desc');
    });

    it('should return 0 changes when no fields provided', async () => {
      const created = await projectRoleService.create(db, { role_name: 'NoChange' });
      const result = await projectRoleService.update(db, created.lastID, {});
      expect(result.changes).toBe(0);
    });
  });

  describe('softDelete', () => {
    it('should soft-delete a role', async () => {
      const created = await projectRoleService.create(db, { role_name: 'Temp Role' });
      const result = await projectRoleService.softDelete(db, created.lastID);
      expect(result.changes).toBe(1);
      const role = await projectRoleService.getById(db, created.lastID);
      expect(role).toBeNull();
    });
  });
});
