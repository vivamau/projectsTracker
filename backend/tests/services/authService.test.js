const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const authService = require('../../services/authService');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('authService', () => {
  describe('login', () => {
    it('should return user data and token for valid credentials', async () => {
      const result = await authService.login(db, 'superadmin@test.com', 'testpassword');
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.user_email).toBe('superadmin@test.com');
      expect(result.user.role).toBe('superadmin');
      expect(result.user.user_password_hash).toBeUndefined();
    });

    it('should return null for invalid email', async () => {
      const result = await authService.login(db, 'nonexistent@test.com', 'testpassword');
      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      const result = await authService.login(db, 'superadmin@test.com', 'wrongpassword');
      expect(result).toBeNull();
    });

    it('should return null for deleted user', async () => {
      const { runQuery } = require('../../config/database');
      await runQuery(db, "INSERT INTO users (user_email, user_name, user_password_hash, user_create_date, userrole_id, user_is_deleted) VALUES ('deleted@test.com', 'Del', '$2a$10$fake', ?, 1, 1)", [Date.now()]);
      const result = await authService.login(db, 'deleted@test.com', 'testpassword');
      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user without password hash', async () => {
      const user = await authService.getUserById(db, 1);
      expect(user).toBeDefined();
      expect(user.user_email).toBe('superadmin@test.com');
      expect(user.role).toBe('superadmin');
      expect(user.user_password_hash).toBeUndefined();
    });

    it('should return null for non-existent user', async () => {
      const user = await authService.getUserById(db, 999);
      expect(user).toBeNull();
    });
  });
});
