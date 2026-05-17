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

  it('throws a human-readable message on 401', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Bad credentials' }),
    });
    await expect(githubBackupService.testConnection('bad_token', 'owner/repo'))
      .rejects.toThrow('GitHub token is invalid or expired');
    delete global.fetch;
  });

  it('throws a human-readable message on 403 not-accessible-by-PAT', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Resource not accessible by personal access token' }),
    });
    await expect(githubBackupService.testConnection('token', 'owner/repo'))
      .rejects.toThrow('Token does not have write access');
    delete global.fetch;
  });

  it('throws a human-readable message on 404', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not Found' }),
    });
    await expect(githubBackupService.testConnection('token', 'owner/repo'))
      .rejects.toThrow('Repository not found');
    delete global.fetch;
  });

  it('throws when repo is not private', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ full_name: 'owner/repo', private: false, permissions: { push: true } }),
    });
    await expect(githubBackupService.testConnection('token', 'owner/repo')).rejects.toThrow('must be private');
    delete global.fetch;
  });

  it('throws when token lacks write access (permissions.push false)', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ full_name: 'owner/repo', private: true, permissions: { push: false } }),
    });
    await expect(githubBackupService.testConnection('token', 'owner/repo'))
      .rejects.toThrow('Token does not have write access');
    delete global.fetch;
  });

  it('throws when permissions field is absent', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ full_name: 'owner/repo', private: true }),
    });
    await expect(githubBackupService.testConnection('token', 'owner/repo'))
      .rejects.toThrow('Token does not have write access');
    delete global.fetch;
  });

  it('returns repo info when connection succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ full_name: 'owner/repo', private: true, permissions: { push: true } }),
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

  it('pushes when no remote file exists (first sync)', async () => {
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtime: new Date('2024-01-01T10:00:00Z') });
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('sqlite-data'));

    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) }); // GET ref → 404 (no branch)
      if (callCount === 2) return Promise.resolve({ ok: true, json: async () => ({ sha: 'blob-sha' }) }); // POST blob
      if (callCount === 3) return Promise.resolve({ ok: true, json: async () => ({ sha: 'tree-sha' }) }); // POST tree
      if (callCount === 4) return Promise.resolve({ ok: true, json: async () => ({ sha: 'commit-sha' }) }); // POST commit
      if (callCount === 5) return Promise.resolve({ ok: true, json: async () => ({}) }); // POST ref
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');
    const result = await githubBackupService.syncDatabase(db, '/tmp/db.sqlite');

    expect(result.action).toBe('pushed');
    expect(result.commitSha).toBe('commit-sha');
    expect(result.syncedAt).toBeDefined();
    const settings = await githubBackupService.getSettings(db);
    expect(settings.lastStatus).toBe('ok');

    jest.restoreAllMocks();
    delete global.fetch;
  });

  it('pushes when local DB is newer than remote', async () => {
    const fs = require('fs');
    const localDate  = new Date('2024-06-01T12:00:00Z');
    const remoteDate = new Date('2024-01-01T10:00:00Z');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtime: localDate });
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('sqlite-data'));

    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: true, json: async () => ({ object: { sha: 'head-sha' } }) });           // GET ref
      if (callCount === 2) return Promise.resolve({ ok: true, json: async () => ({ tree: { sha: 'tree-sha' } }) });             // GET commit
      if (callCount === 3) return Promise.resolve({ ok: true, json: async () => ({ tree: [{ path: 'database.sqlite', sha: 'blob-sha' }] }) }); // GET tree
      if (callCount === 4) return Promise.resolve({ ok: true, json: async () => ([{ commit: { committer: { date: remoteDate.toISOString() } } }]) }); // GET commits for file
      if (callCount === 5) return Promise.resolve({ ok: true, json: async () => ({ sha: 'new-blob-sha' }) });                   // POST blob
      if (callCount === 6) return Promise.resolve({ ok: true, json: async () => ({ sha: 'new-tree-sha' }) });                   // POST tree
      if (callCount === 7) return Promise.resolve({ ok: true, json: async () => ({ sha: 'new-commit-sha' }) });                 // POST commit
      if (callCount === 8) return Promise.resolve({ ok: true, json: async () => ({}) });                                        // PATCH ref
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');
    const result = await githubBackupService.syncDatabase(db, '/tmp/db.sqlite');

    expect(result.action).toBe('pushed');
    expect(result.commitSha).toBe('new-commit-sha');

    jest.restoreAllMocks();
    delete global.fetch;
  });

  it('pulls when remote DB is newer than local', async () => {
    const fs = require('fs');
    const localDate  = new Date('2024-01-01T10:00:00Z');
    const remoteDate = new Date('2024-06-01T12:00:00Z');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtime: localDate });
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    const base64Content = Buffer.from('remote-sqlite-data').toString('base64');
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: true, json: async () => ({ object: { sha: 'head-sha' } }) });           // GET ref
      if (callCount === 2) return Promise.resolve({ ok: true, json: async () => ({ tree: { sha: 'tree-sha' } }) });             // GET commit
      if (callCount === 3) return Promise.resolve({ ok: true, json: async () => ({ tree: [{ path: 'database.sqlite', sha: 'blob-sha' }] }) }); // GET tree
      if (callCount === 4) return Promise.resolve({ ok: true, json: async () => ([{ commit: { committer: { date: remoteDate.toISOString() } } }]) }); // GET commits for file
      if (callCount === 5) return Promise.resolve({ ok: true, json: async () => ({ content: base64Content, encoding: 'base64' }) }); // GET blob
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');
    const result = await githubBackupService.syncDatabase(db, '/tmp/db.sqlite');

    expect(result.action).toBe('pulled');
    expect(result.requiresRestart).toBe(true);
    expect(result.syncedAt).toBeDefined();
    // Staging file written with correct content
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/tmp/db.sqlite.github-restore',
      expect.any(Buffer)
    );
    const settings = await githubBackupService.getSettings(db);
    expect(settings.lastStatus).toBe('ok');

    jest.restoreAllMocks();
    delete global.fetch;
  });

  it('returns up_to_date when local and remote dates are equal', async () => {
    const fs = require('fs');
    const sharedDate = new Date('2024-06-01T12:00:00Z');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtime: sharedDate });

    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: true, json: async () => ({ object: { sha: 'head-sha' } }) });
      if (callCount === 2) return Promise.resolve({ ok: true, json: async () => ({ tree: { sha: 'tree-sha' } }) });
      if (callCount === 3) return Promise.resolve({ ok: true, json: async () => ({ tree: [{ path: 'database.sqlite', sha: 'blob-sha' }] }) });
      if (callCount === 4) return Promise.resolve({ ok: true, json: async () => ([{ commit: { committer: { date: sharedDate.toISOString() } } }]) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');
    const result = await githubBackupService.syncDatabase(db, '/tmp/db.sqlite');

    expect(result.action).toBe('up_to_date');
    expect(result.syncedAt).toBeDefined();

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
