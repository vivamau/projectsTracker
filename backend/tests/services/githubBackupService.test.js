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

let db, auditDb;

beforeEach(() => { mockSecrets = {}; });
beforeAll(async () => { db = await initTestDb(); auditDb = await initTestDb(); });
afterAll(async () => { await closeTestDb(db); await closeTestDb(auditDb); });

describe('githubBackupService.getSettings', () => {
  it('returns defaults when no settings stored', async () => {
    const s = await githubBackupService.getSettings(db);
    expect(s.enabled).toBe(false);
    expect(s.branch).toBe('main');
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
    }, 'admin@test.com');

    const s = await githubBackupService.getSettings(db);
    expect(s.enabled).toBe(true);
    expect(s.token).toBe('ghp_test');
    expect(s.repo).toBe('owner/repo');
    expect(s.branch).toBe('backup');
  });

  it('defaults branch to main when empty string provided', async () => {
    await githubBackupService.saveSettings(db, { enabled: false, branch: '' }, 'admin@test.com');
    const s = await githubBackupService.getSettings(db);
    expect(s.branch).toBe('main');
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

describe('githubBackupService.syncAll', () => {
  it('throws when backup is not enabled', async () => {
    await githubBackupService.saveSettings(db, { enabled: false, token: 't', repo: 'o/r' }, 'admin@test.com');
    await expect(githubBackupService.syncAll(db, '/tmp/data')).rejects.toThrow('not enabled');
  });

  it('throws when token is not configured', async () => {
    await githubBackupService.saveSettings(db, { enabled: true, token: '', repo: 'o/r' }, 'admin@test.com');
    await expect(githubBackupService.syncAll(db, '/tmp/data')).rejects.toThrow('token is not configured');
  });

  it('throws when repo is not configured', async () => {
    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: '' }, 'admin@test.com');
    await expect(githubBackupService.syncAll(db, '/tmp/data')).rejects.toThrow('repository is not configured');
  });

  it('pushes both DB files when no remote exists (first sync)', async () => {
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockImplementation(p => !String(p).endsWith('notes'));
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtime: new Date('2024-01-01T10:00:00Z') });
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('sqlite-data'));

    // Call sequence for no remote branch:
    // 1. GET ref → 404 (no branch, getRemoteTree returns empty)
    // 2. POST blob (database.sqlite)
    // 3. POST blob (audit.sqlite)
    // 4. POST tree
    // 5. POST commit
    // 6. POST ref (create)
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) }); // GET ref → 404
      if (callCount === 2) return Promise.resolve({ ok: true, json: async () => ({ sha: 'db-blob-sha' }) });     // POST blob db
      if (callCount === 3) return Promise.resolve({ ok: true, json: async () => ({ sha: 'audit-blob-sha' }) });  // POST blob audit
      if (callCount === 4) return Promise.resolve({ ok: true, json: async () => ({ sha: 'tree-sha' }) });        // POST tree
      if (callCount === 5) return Promise.resolve({ ok: true, json: async () => ({ sha: 'commit-sha' }) });      // POST commit
      if (callCount === 6) return Promise.resolve({ ok: true, json: async () => ({}) });                          // POST ref
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');
    const result = await githubBackupService.syncAll(db, '/tmp/data');

    expect(result.pushed).toEqual(expect.arrayContaining(['database.sqlite', 'audit.sqlite']));
    expect(result.pulled).toEqual([]);
    expect(result.commitSha).toBe('commit-sha');
    expect(result.requiresRestart).toBe(false);
    expect(result.syncedAt).toBeDefined();
    const settings = await githubBackupService.getSettings(db);
    expect(settings.lastStatus).toBe('ok');

    jest.restoreAllMocks();
    delete global.fetch;
  });

  it('pushes both DB files when local is newer than remote', async () => {
    const fs = require('fs');
    const localDate  = new Date('2024-06-01T12:00:00Z');
    const remoteDate = new Date('2024-01-01T10:00:00Z');
    jest.spyOn(fs, 'existsSync').mockImplementation(p => !String(p).endsWith('notes'));
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtime: localDate });
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('sqlite-data'));

    // Call sequence:
    // 1. GET ref → head-sha
    // 2. GET commit → base-tree-sha
    // 3. GET tree → both files present
    // 4. GET commits for database.sqlite → remoteDate
    // 5. GET commits for audit.sqlite → remoteDate
    // 6. POST blob (database.sqlite)
    // 7. POST blob (audit.sqlite)
    // 8. POST tree
    // 9. POST commit
    // 10. PATCH ref
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: true, json: async () => ({ object: { sha: 'head-sha' } }) });
      if (callCount === 2) return Promise.resolve({ ok: true, json: async () => ({ tree: { sha: 'base-tree-sha' } }) });
      if (callCount === 3) return Promise.resolve({ ok: true, json: async () => ({
        tree: [
          { path: 'database.sqlite', sha: 'db-blob', type: 'blob' },
          { path: 'audit.sqlite',    sha: 'audit-blob', type: 'blob' },
        ],
      })});
      if (callCount === 4 || callCount === 5) return Promise.resolve({ ok: true, json: async () => (
        [{ commit: { committer: { date: remoteDate.toISOString() } } }]
      )});
      if (callCount === 6) return Promise.resolve({ ok: true, json: async () => ({ sha: 'new-db-blob' }) });
      if (callCount === 7) return Promise.resolve({ ok: true, json: async () => ({ sha: 'new-audit-blob' }) });
      if (callCount === 8) return Promise.resolve({ ok: true, json: async () => ({ sha: 'new-tree-sha' }) });
      if (callCount === 9) return Promise.resolve({ ok: true, json: async () => ({ sha: 'new-commit-sha' }) });
      if (callCount === 10) return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');
    const result = await githubBackupService.syncAll(db, '/tmp/data');

    expect(result.pushed).toEqual(expect.arrayContaining(['database.sqlite', 'audit.sqlite']));
    expect(result.pulled).toEqual([]);
    expect(result.commitSha).toBe('new-commit-sha');

    jest.restoreAllMocks();
    delete global.fetch;
  });

  it('pulls DB files to staging when remote is newer than local', async () => {
    const fs = require('fs');
    const localDate  = new Date('2024-01-01T10:00:00Z');
    const remoteDate = new Date('2024-06-01T12:00:00Z');
    jest.spyOn(fs, 'existsSync').mockImplementation(p => !String(p).endsWith('notes'));
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtime: localDate });
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    const base64Content = Buffer.from('remote-sqlite-data').toString('base64');
    // Call sequence:
    // 1. GET ref → head-sha
    // 2. GET commit → base-tree-sha
    // 3. GET tree → both files
    // 4. GET commits database.sqlite → remoteDate
    // 5. GET commits audit.sqlite → remoteDate
    // 6. GET blob database.sqlite → content
    // 7. GET blob audit.sqlite → content
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: true, json: async () => ({ object: { sha: 'head-sha' } }) });
      if (callCount === 2) return Promise.resolve({ ok: true, json: async () => ({ tree: { sha: 'base-tree-sha' } }) });
      if (callCount === 3) return Promise.resolve({ ok: true, json: async () => ({
        tree: [
          { path: 'database.sqlite', sha: 'db-blob', type: 'blob' },
          { path: 'audit.sqlite',    sha: 'audit-blob', type: 'blob' },
        ],
      })});
      if (callCount === 4 || callCount === 5) return Promise.resolve({ ok: true, json: async () => (
        [{ commit: { committer: { date: remoteDate.toISOString() } } }]
      )});
      // GET blobs (sequential pulls)
      if (callCount === 6 || callCount === 7) return Promise.resolve({ ok: true, json: async () => ({
        content: base64Content,
        encoding: 'base64',
      })});
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');
    const result = await githubBackupService.syncAll(db, '/tmp/data');

    expect(result.pulled).toEqual(expect.arrayContaining(['database.sqlite', 'audit.sqlite']));
    expect(result.pushed).toEqual([]);
    expect(result.requiresRestart).toBe(true);
    expect(result.syncedAt).toBeDefined();

    // Both DB files written to staging paths
    expect(fs.writeFileSync).toHaveBeenCalledWith('/tmp/data/database.sqlite.github-restore', expect.any(Buffer));
    expect(fs.writeFileSync).toHaveBeenCalledWith('/tmp/data/audit.sqlite.github-restore', expect.any(Buffer));

    const settings = await githubBackupService.getSettings(db);
    expect(settings.lastStatus).toBe('ok');

    jest.restoreAllMocks();
    delete global.fetch;
  });

  it('returns up_to_date when local and remote dates match', async () => {
    const fs = require('fs');
    const sharedDate = new Date('2024-06-01T12:00:00Z');
    jest.spyOn(fs, 'existsSync').mockImplementation(p => !String(p).endsWith('notes'));
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtime: sharedDate });

    // Call sequence: ref, commit, tree, 2× file-date
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: true, json: async () => ({ object: { sha: 'head-sha' } }) });
      if (callCount === 2) return Promise.resolve({ ok: true, json: async () => ({ tree: { sha: 'base-tree-sha' } }) });
      if (callCount === 3) return Promise.resolve({ ok: true, json: async () => ({
        tree: [
          { path: 'database.sqlite', sha: 'db-blob', type: 'blob' },
          { path: 'audit.sqlite',    sha: 'audit-blob', type: 'blob' },
        ],
      })});
      if (callCount === 4 || callCount === 5) return Promise.resolve({ ok: true, json: async () => (
        [{ commit: { committer: { date: sharedDate.toISOString() } } }]
      )});
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');
    const result = await githubBackupService.syncAll(db, '/tmp/data');

    expect(result.pushed).toEqual([]);
    expect(result.pulled).toEqual([]);
    expect(result.upToDate).toEqual(expect.arrayContaining(['database.sqlite', 'audit.sqlite']));
    expect(result.commitSha).toBeNull();
    expect(result.syncedAt).toBeDefined();

    jest.restoreAllMocks();
    delete global.fetch;
  });

  it('pushes a local note file when it is newer than remote', async () => {
    const fs = require('fs');
    const localDate  = new Date('2024-06-01T12:00:00Z');
    const remoteDate = new Date('2024-01-01T10:00:00Z');

    jest.spyOn(fs, 'existsSync').mockImplementation(() => true);
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtime: localDate });
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('sqlite-or-md-data'));
    jest.spyOn(fs, 'readdirSync').mockImplementation(p =>
      String(p).endsWith('notes') ? ['1.md'] : []
    );

    // Sequence: ref, commit, tree (no remote notes), then push 3 files (db, audit, note)
    // Tree has database.sqlite and audit.sqlite at remoteDate, no notes
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: true, json: async () => ({ object: { sha: 'head-sha' } }) });
      if (callCount === 2) return Promise.resolve({ ok: true, json: async () => ({ tree: { sha: 'base-tree-sha' } }) });
      if (callCount === 3) return Promise.resolve({ ok: true, json: async () => ({
        tree: [
          { path: 'database.sqlite', sha: 'db-blob', type: 'blob' },
          { path: 'audit.sqlite',    sha: 'audit-blob', type: 'blob' },
        ],
      })});
      if (callCount === 4 || callCount === 5) return Promise.resolve({ ok: true, json: async () => (
        [{ commit: { committer: { date: remoteDate.toISOString() } } }]
      )});
      // POST blobs: db, audit, note
      if (callCount === 6) return Promise.resolve({ ok: true, json: async () => ({ sha: 'db-blob-new' }) });
      if (callCount === 7) return Promise.resolve({ ok: true, json: async () => ({ sha: 'audit-blob-new' }) });
      if (callCount === 8) return Promise.resolve({ ok: true, json: async () => ({ sha: 'note-blob-new' }) });
      if (callCount === 9) return Promise.resolve({ ok: true, json: async () => ({ sha: 'new-tree-sha' }) });
      if (callCount === 10) return Promise.resolve({ ok: true, json: async () => ({ sha: 'new-commit-sha' }) });
      if (callCount === 11) return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');
    const result = await githubBackupService.syncAll(db, '/tmp/data');

    expect(result.pushed).toEqual(expect.arrayContaining(['database.sqlite', 'audit.sqlite', 'notes/1.md']));
    expect(result.pulled).toEqual([]);
    expect(result.commitSha).toBe('new-commit-sha');

    jest.restoreAllMocks();
    delete global.fetch;
  });

  it('pulls a note file directly (not to staging) when remote is newer', async () => {
    const fs = require('fs');
    const localDate  = new Date('2024-01-01T10:00:00Z');
    const remoteDate = new Date('2024-06-01T12:00:00Z');
    const sharedDate = new Date('2024-03-01T00:00:00Z');

    jest.spyOn(fs, 'existsSync').mockImplementation(() => true);
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtime: sharedDate }); // DBs are equal, note is older locally
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readdirSync').mockImplementation(p =>
      String(p).endsWith('notes') ? ['1.md'] : []
    );

    const noteBase64 = Buffer.from('# note content').toString('base64');
    // Tree has both DBs (at sharedDate) and notes/1.md (at remoteDate)
    // DBs: up_to_date; notes/1.md: remote newer → pull
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: true, json: async () => ({ object: { sha: 'head-sha' } }) });
      if (callCount === 2) return Promise.resolve({ ok: true, json: async () => ({ tree: { sha: 'base-tree-sha' } }) });
      if (callCount === 3) return Promise.resolve({ ok: true, json: async () => ({
        tree: [
          { path: 'database.sqlite', sha: 'db-blob', type: 'blob' },
          { path: 'audit.sqlite',    sha: 'audit-blob', type: 'blob' },
          { path: 'notes/1.md',      sha: 'note-blob', type: 'blob' },
        ],
      })});
      // File dates: db=sharedDate, audit=sharedDate, note=remoteDate (newer)
      if (callCount === 4) return Promise.resolve({ ok: true, json: async () => (
        [{ commit: { committer: { date: sharedDate.toISOString() } } }]
      )});
      if (callCount === 5) return Promise.resolve({ ok: true, json: async () => (
        [{ commit: { committer: { date: sharedDate.toISOString() } } }]
      )});
      if (callCount === 6) return Promise.resolve({ ok: true, json: async () => (
        [{ commit: { committer: { date: remoteDate.toISOString() } } }]
      )});
      // GET blob for note
      if (callCount === 7) return Promise.resolve({ ok: true, json: async () => ({
        content: noteBase64,
        encoding: 'base64',
      })});
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');
    const result = await githubBackupService.syncAll(db, '/tmp/data');

    expect(result.pulled).toEqual(['notes/1.md']);
    expect(result.pushed).toEqual([]);
    expect(result.requiresRestart).toBe(false);

    // Note written directly (not as staging)
    expect(fs.writeFileSync).toHaveBeenCalledWith('/tmp/data/notes/1.md', expect.any(Buffer));
    // No staging file written
    expect(fs.writeFileSync).not.toHaveBeenCalledWith(expect.stringContaining('.github-restore'), expect.anything());

    jest.restoreAllMocks();
    delete global.fetch;
  });

  it('checkpoints WAL on db and auditDb before syncing', async () => {
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');

    const dbRunSpy    = jest.spyOn(db,      'run');
    const auditRunSpy = jest.spyOn(auditDb, 'run');

    await githubBackupService.syncAll(db, '/tmp/data', auditDb);

    expect(dbRunSpy).toHaveBeenCalledWith('PRAGMA wal_checkpoint(TRUNCATE)', expect.any(Function));
    expect(auditRunSpy).toHaveBeenCalledWith('PRAGMA wal_checkpoint(TRUNCATE)', expect.any(Function));

    jest.restoreAllMocks();
    delete global.fetch;
  });

  it('still checkpoints db when auditDb is not provided', async () => {
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    await githubBackupService.saveSettings(db, { enabled: true, token: 'tok', repo: 'owner/repo' }, 'admin@test.com');

    const dbRunSpy = jest.spyOn(db, 'run');

    await githubBackupService.syncAll(db, '/tmp/data');

    expect(dbRunSpy).toHaveBeenCalledWith('PRAGMA wal_checkpoint(TRUNCATE)', expect.any(Function));

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
