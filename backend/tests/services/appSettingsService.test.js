const { initTestDb, closeTestDb } = require('../helpers/testDb');
const appSettingsService = require('../../services/appSettingsService');

let db;

beforeAll(async () => {
  db = await initTestDb();
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('appSettingsService.get', () => {
  it('returns null for non-existent key', async () => {
    const value = await appSettingsService.get(db, 'nonexistent');
    expect(value).toBeNull();
  });

  it('returns the value for an existing key', async () => {
    await appSettingsService.set(db, 'test_key', 'test_value', 'admin@test.com');
    const value = await appSettingsService.get(db, 'test_key');
    expect(value).toBe('test_value');
  });
});

describe('appSettingsService.set', () => {
  it('creates a new setting', async () => {
    await appSettingsService.set(db, 'new_key', 'new_value', 'admin@test.com');
    const row = await appSettingsService.getWithMeta(db, 'new_key');
    expect(row.setting_value).toBe('new_value');
    expect(row.updated_by).toBe('admin@test.com');
    expect(row.updated_at).toBeDefined();
  });

  it('updates an existing setting', async () => {
    await appSettingsService.set(db, 'update_key', 'v1', 'admin@test.com');
    await appSettingsService.set(db, 'update_key', 'v2', 'superadmin@test.com');
    const value = await appSettingsService.get(db, 'update_key');
    expect(value).toBe('v2');
    const row = await appSettingsService.getWithMeta(db, 'update_key');
    expect(row.updated_by).toBe('superadmin@test.com');
  });
});

describe('appSettingsService.getWithMeta', () => {
  it('returns null for non-existent key', async () => {
    const row = await appSettingsService.getWithMeta(db, 'totally_missing_key');
    expect(row).toBeNull();
  });
});

describe('appSettingsService.set without updatedBy', () => {
  it('allows null updatedBy', async () => {
    await appSettingsService.set(db, 'no_by_key', 'value', null);
    const row = await appSettingsService.getWithMeta(db, 'no_by_key');
    expect(row.updated_by).toBeNull();
  });
});

describe('appSettingsService.getAll', () => {
  it('returns all settings as array', async () => {
    await appSettingsService.set(db, 'key_a', 'val_a', 'admin@test.com');
    await appSettingsService.set(db, 'key_b', 'val_b', 'admin@test.com');
    const settings = await appSettingsService.getAll(db);
    expect(settings.length).toBeGreaterThanOrEqual(2);
    const keys = settings.map(s => s.setting_key);
    expect(keys).toContain('key_a');
    expect(keys).toContain('key_b');
  });
});
