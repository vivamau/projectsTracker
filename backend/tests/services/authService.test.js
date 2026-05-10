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

    it('should return null for inactive user (user_active=0)', async () => {
      const { runQuery } = require('../../config/database');
      await runQuery(db,
        "INSERT INTO users (user_email, user_name, user_lastname, user_password_hash, user_create_date, userrole_id, user_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['inactive@test.com', 'Inactive', 'User', null, Date.now(), 4, 0]
      );
      const result = await authService.login(db, 'inactive@test.com', 'anypassword');
      expect(result).toBeNull();
    });

    it('should return null for user with no password hash', async () => {
      const { runQuery } = require('../../config/database');
      await runQuery(db,
        "INSERT INTO users (user_email, user_name, user_lastname, user_password_hash, user_create_date, userrole_id, user_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['nohash@test.com', 'NoHash', 'User', null, Date.now(), 4, 1]
      );
      const result = await authService.login(db, 'nohash@test.com', 'anypassword');
      expect(result).toBeNull();
    });

    it('should return { expired: true } for user with past expire date', async () => {
      const bcrypt = require('bcryptjs');
      const { runQuery, getOne } = require('../../config/database');
      const hash = await bcrypt.hash('testpassword', 10);
      const pastTs = Date.now() - 1000;
      await runQuery(db,
        "INSERT INTO users (user_email, user_name, user_lastname, user_password_hash, user_create_date, userrole_id, user_active, user_expire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ['expired@test.com', 'Exp', 'User', hash, Date.now(), 3, 1, pastTs]
      );
      const result = await authService.login(db, 'expired@test.com', 'testpassword');
      expect(result).toEqual({ expired: true });

      // user must be deactivated but expire date preserved
      const user = await getOne(db, "SELECT user_active, userrole_id, user_password_hash, user_expire_date FROM users WHERE user_email = 'expired@test.com'", []);
      expect(user.user_active).toBe(0);
      expect(user.userrole_id).toBe(4);
      expect(user.user_password_hash).toBeNull();
      expect(user.user_expire_date).toBe(pastTs);
    });

    it('should allow login when expire date is in the future', async () => {
      const bcrypt = require('bcryptjs');
      const { runQuery } = require('../../config/database');
      const hash = await bcrypt.hash('testpassword', 10);
      const futureTs = Date.now() + 10 * 24 * 60 * 60 * 1000;
      await runQuery(db,
        "INSERT INTO users (user_email, user_name, user_lastname, user_password_hash, user_create_date, userrole_id, user_active, user_expire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ['notexpired@test.com', 'NotExp', 'User', hash, Date.now(), 3, 1, futureTs]
      );
      const result = await authService.login(db, 'notexpired@test.com', 'testpassword');
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
    });
  });

  describe('updateAvatarSeed', () => {
    it('should update avatar seed for a user', async () => {
      await authService.updateAvatarSeed(db, 1, 'alpha');
      const user = await authService.getUserById(db, 1);
      expect(user.user_avatar_seed).toBe('alpha');
    });

    it('should clear avatar seed when null is passed', async () => {
      await authService.updateAvatarSeed(db, 1, null);
      const user = await authService.getUserById(db, 1);
      expect(user.user_avatar_seed).toBeNull();
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
