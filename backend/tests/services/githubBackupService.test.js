// Mock secretsStore so token uses in-memory storage (no file I/O in tests)
let mockSecrets = {};
jest.mock('../../services/secretsStore', () => ({
  getStore: () => ({
    get:     (k)    => mockSecrets[k] ?? null,
    set:     (k, v) => { mockSecrets[k] = v; },
    setMany: (d)    => { Object.assign(mockSecrets, d); },
    getAll:  ()     => ({ ...mockSecrets }),
    delete:  (k)    => { delete mockSecrets[k]; },
  }),
}));

const { initTestDb, closeTestDb } = require('../helpers/testDb');
const githubBackupService = require('../../services/githubBackupService');
const appSettingsService = require('../../services/appSettingsService');

let db;

beforeEach(() => { mockSecrets = {}; });
beforeAll(async () => { db = await initTestDb(); });
afterAll(async () => { await closeTestDb(db); });

describe('githubBackupService.getSettings', () => {
  it('returns defaults when no settings stored', async () => {
    const s = await githubBackupService.getSettings(db);
    expect(s.enabled).toBe(false);
    expect(s.branch).toBe('main');
    expect(s.filePath).toBe('database.sqlite');
    expect(s.token).toBe('');
    expect(s.repo).toBe('');
    expect(s.lastSync).toBeNull();
    expect(s.lastStatus).toBeNull();
  });
});

describe('githubBackupService.saveSettings', () => {
  it('persists all provided fields', async () => {
    await githubBackupService.saveSettings(db, {
      enabled: true,
      token: 'ghp_test',
      repo: 'owner/repo',
      branch: 'backup',
      filePath: 'backups/db.sqlite',
    }, 'admin@test.com');

    const s = await githubBackupService.getSettings(db);
    expect(s.enabled).toBe(true);
    expect(s.token).toBe('ghp_test');
    expect(s.repo).toBe('owner/repo');
    expect(s.branch).toBe('backup');
    expect(s.filePath).toBe('backups/db.sqlite');
  });

  it('defaults branch to main when empty string provided', async () => {
    await githubBackupService.saveSettings(db, { enabled: false, branch: '' }, 'admin@test.com');
    const s = await githubBackupService.getSettings(db);
    expect(s.branch).toBe('main');
  });

  it('defaults filePath to database.sqlite when empty string provided', async () => {
    await githubBackupService.saveSettings(db, { enabled: false, filePath: '' }, 'admin@test.com');
    const s = await githubBackupService.getSettings(db);
    expect(s.filePath).toBe('database.sqlite');
  });

  it('does not update token when not provided', async () => {
    await githubBackupService.saveSettings(db, { enabled: true, token: 'original' }, 'admin@test.com');
    await githubBackupService.saveSettings(db, { enabled: false }, 'admin@test.com');
    const s = await githubBackupService.getSettings(db);
    expect(s.token).toBe('original');
  });
});

describe('githubBackupService.testConnection', () => {
  it('throws when token is missing', async () => {
    await expect(githubBackupService.testConnection('', 'owner/repo')).rejects.toThrow('Token is required');
  });

  it('throws on invalid repo format', async () => {
    await expect(githubBackupService.testConnection('token', 'invalidrepo')).rejects.toThrow('Invalid repo format');
  });

  it('throws on missing owner or repo name', async () => {
    await expect(githubBackupService.testConnection('token', '/repo')).rejects.toThrow('Invalid repo format');
    await expect(githubBackupService.testConnection('token', 'owner/')).rejects.toThrow('Invalid repo format');
  });

  it('throws when fetch returns non-OK response', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => '{"message":"Bad credentials"}',
    });
    await expect(githubBackupService.testConnection('bad_token', 'owner/repo')).rejects.toThrow('GitHub API 401');
    delete global.fetch;
  });

  it('throws when repo is not private', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ full_name: 'owner/repo', private: false }),
    });
    await expect(githubBackupService.testConnection('token', 'owner/repo')).rejects.toThrow('must be private');
    delete global.fetch;
  });

  it('returns repo info when connection succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ full_name: 'owner/repo', private: true }),
    });
    const result = await githubBackupService.testConnection('token', 'owner/repo');
    expect(result.name).toBe('owner/repo');
    expect(result.private).toBe(true);
    delete global.fetch;
  });
});

describe('githubBackupService.syncDatabase', () => {
  it('throws when backup is not enabled', async () => {
    await githubBackupService.saveSettings(db, { enabled: false, token: 't', repo: 'o/r' }, 'admin@test.com');
    await expect(githubBackupService.syncDatabase(db, '/tmp/test.sqlite')).rejects.toThrow('not enabled');
  });

  it('throws when token is not configured', async () => {
    await githubBackupService.saveSettings(db, { enabled: true, token: '', repo: 'o/r' }, 'admin@test.com');
    await expect(githubBackupService.syncDatabase(db, '/tmp/test.sqlite')).rejects.toThrow('token is not configured');
  });

  it('throws when repo is not configured', async () => {
    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: '' }, 'admin@test.com');
    await expect(githubBackupService.syncDatabase(db, '/tmp/test.sqlite')).rejects.toThrow('repository is not configured');
  });

  it('calls GitHub API and updates last sync on success', async () => {
    const fs = require('fs');
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('sqlite-data'));

    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Create blob
        return Promise.resolve({ ok: true, json: async () => ({ sha: 'blob-sha' }) });
      }
      if (callCount === 2) {
        // GET ref — simulate first push (404)
        return Promise.resolve({ ok: false, status: 404, text: async () => 'Not Found', json: async () => ({}) });
      }
      if (callCount === 3) {
        // Create tree
        return Promise.resolve({ ok: true, json: async () => ({ sha: 'tree-sha' }) });
      }
      if (callCount === 4) {
        // Create commit
        return Promise.resolve({ ok: true, json: async () => ({ sha: 'commit-sha' }) });
      }
      if (callCount === 5) {
        // Create ref
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');
    const result = await githubBackupService.syncDatabase(db, '/tmp/db.sqlite');
    expect(result.commitSha).toBe('commit-sha');
    expect(result.syncedAt).toBeDefined();

    const settings = await githubBackupService.getSettings(db);
    expect(settings.lastSync).toBe(result.syncedAt);
    expect(settings.lastStatus).toBe('ok');

    jest.restoreAllMocks();
    delete global.fetch;
  });
});

describe('githubBackupService.recordFailure', () => {
  it('stores error status in settings', async () => {
    await githubBackupService.recordFailure(db, 'network error');
    const s = await githubBackupService.getSettings(db);
    expect(s.lastStatus).toBe('error: network error');
  });
});
