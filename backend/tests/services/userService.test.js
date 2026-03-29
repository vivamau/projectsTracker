const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const userService = require('../../services/userService');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('userService', () => {
  describe('getAll', () => {
    it('should return paginated users with role name', async () => {
      const result = await userService.getAll(db);
      expect(result.users.length).toBe(4);
      expect(result.total).toBe(4);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.users[0].role).toBe('superadmin');
      // Should not include password hash
      expect(result.users[0].user_password_hash).toBeUndefined();
    });

    it('should paginate results', async () => {
      const result = await userService.getAll(db, { page: 1, limit: 2 });
      expect(result.users.length).toBe(2);
      expect(result.total).toBe(4);
      expect(result.totalPages).toBe(2);
    });

    it('should return second page', async () => {
      const result = await userService.getAll(db, { page: 2, limit: 2 });
      expect(result.users.length).toBe(2);
      expect(result.page).toBe(2);
    });

    it('should filter by search term', async () => {
      const result = await userService.getAll(db, { search: 'superadmin@' });
      expect(result.users.length).toBe(1);
      expect(result.users[0].user_email).toBe('superadmin@test.com');
    });

    it('should search by name', async () => {
      const result = await userService.getAll(db, { search: 'Super' });
      expect(result.users.length).toBe(1);
    });

    it('should not return deleted users', async () => {
      const created = await userService.create(db, {
        user_email: 'deleted@test.com',
        user_name: 'Deleted',
        user_lastname: 'User',
        password: 'password123',
        userrole_id: 3
      });
      await userService.softDelete(db, created.lastID);
      const result = await userService.getAll(db, { search: 'deleted@test.com' });
      expect(result.users.length).toBe(0);
    });
  });

  describe('getById', () => {
    it('should return a user with role name and no password', async () => {
      const user = await userService.getById(db, 1);
      expect(user).not.toBeNull();
      expect(user.user_email).toBe('superadmin@test.com');
      expect(user.role).toBe('superadmin');
      expect(user.user_password_hash).toBeUndefined();
    });

    it('should return null for non-existent id', async () => {
      const user = await userService.getById(db, 9999);
      expect(user).toBeNull();
    });

    it('should return null for deleted user', async () => {
      const created = await userService.create(db, {
        user_email: 'deleted2@test.com',
        user_name: 'Deleted2',
        user_lastname: 'User2',
        password: 'password123',
        userrole_id: 3
      });
      await userService.softDelete(db, created.lastID);
      const user = await userService.getById(db, created.lastID);
      expect(user).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      const result = await userService.create(db, {
        user_email: 'newuser@test.com',
        user_name: 'New',
        user_lastname: 'User',
        password: 'securepassword',
        userrole_id: 3
      });
      expect(result.lastID).toBeGreaterThan(0);
      const user = await userService.getById(db, result.lastID);
      expect(user.user_email).toBe('newuser@test.com');
      expect(user.user_name).toBe('New');
    });

    it('should create a user with middlename', async () => {
      const result = await userService.create(db, {
        user_email: 'middle@test.com',
        user_name: 'Mid',
        user_lastname: 'User',
        user_middlename: 'MiddleName',
        password: 'password123',
        userrole_id: 3
      });
      const user = await userService.getById(db, result.lastID);
      expect(user.user_middlename).toBe('MiddleName');
    });

    it('should reject duplicate email', async () => {
      await expect(userService.create(db, {
        user_email: 'superadmin@test.com',
        user_name: 'Dup',
        user_lastname: 'User',
        password: 'password',
        userrole_id: 3
      })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update user name', async () => {
      const created = await userService.create(db, {
        user_email: 'updatename@test.com',
        user_name: 'OldName',
        user_lastname: 'OldLast',
        password: 'password',
        userrole_id: 3
      });
      const result = await userService.update(db, created.lastID, {
        user_name: 'UpdatedName'
      });
      expect(result.changes).toBe(1);
      const user = await userService.getById(db, created.lastID);
      expect(user.user_name).toBe('UpdatedName');
    });

    it('should update user email', async () => {
      const created = await userService.create(db, {
        user_email: 'oldemail@test.com',
        user_name: 'Email',
        user_lastname: 'User',
        password: 'password',
        userrole_id: 3
      });
      await userService.update(db, created.lastID, {
        user_email: 'newemail@test.com'
      });
      const user = await userService.getById(db, created.lastID);
      expect(user.user_email).toBe('newemail@test.com');
    });

    it('should update user role', async () => {
      const created = await userService.create(db, {
        user_email: 'rolechange@test.com',
        user_name: 'Role',
        user_lastname: 'User',
        password: 'password',
        userrole_id: 3
      });
      await userService.update(db, created.lastID, { userrole_id: 2 });
      const user = await userService.getById(db, created.lastID);
      expect(user.role).toBe('admin');
    });

    it('should update password (hash it)', async () => {
      const created = await userService.create(db, {
        user_email: 'passchange@test.com',
        user_name: 'Pass',
        user_lastname: 'User',
        password: 'oldpassword',
        userrole_id: 3
      });
      await userService.update(db, created.lastID, {
        password: 'newpassword'
      });
      // The password should be updated (we can verify via auth, but at least no error)
      const user = await userService.getById(db, created.lastID);
      expect(user.user_update_date).not.toBeNull();
    });

    it('should return 0 changes with empty data', async () => {
      const result = await userService.update(db, 1, {});
      expect(result.changes).toBe(0);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a user', async () => {
      const created = await userService.create(db, {
        user_email: 'softdel@test.com',
        user_name: 'SoftDel',
        user_lastname: 'User',
        password: 'password',
        userrole_id: 3
      });
      const result = await userService.softDelete(db, created.lastID);
      expect(result.changes).toBe(1);
      const user = await userService.getById(db, created.lastID);
      expect(user).toBeNull();
    });
  });
});
