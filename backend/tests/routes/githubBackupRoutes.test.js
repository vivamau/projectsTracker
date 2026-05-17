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

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const { initTestDb, closeTestDb } = require('../helpers/testDb');
const { TEST_SECRET, superadminToken, adminToken, readerToken } = require('../helpers/testAuth');
const createGithubBackupRoutes = require('../../routes/githubBackupRoutes');
const githubBackupService = require('../../services/githubBackupService');

let db, app;

beforeEach(() => { mockSecrets = {}; });

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_SECRET;
  db = await initTestDb();

  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/github-backup', createGithubBackupRoutes(db));
});

afterAll(async () => { await closeTestDb(db); });
afterEach(() => jest.restoreAllMocks());

describe('GET /api/github-backup', () => {
  it('returns settings for superadmin with token masked', async () => {
    await githubBackupService.saveSettings(db, { enabled: true, token: 'secret-token', repo: 'o/r' }, 'sa@test.com');
    const res = await request(app)
      .get('/api/github-backup')
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('••••••••');
    expect(res.body.data.repo).toBe('o/r');
    expect(res.body.data.enabled).toBe(true);
  });

  it('rejects admin', async () => {
    const res = await request(app)
      .get('/api/github-backup')
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(403);
  });

  it('rejects reader', async () => {
    const res = await request(app)
      .get('/api/github-backup')
      .set('Cookie', ['token=' + readerToken()]);
    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated', async () => {
    const res = await request(app).get('/api/github-backup');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/github-backup/settings', () => {
  it('saves settings and returns masked token', async () => {
    const res = await request(app)
      .put('/api/github-backup/settings')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ enabled: true, token: 'ghp_newtoken', repo: 'myorg/myrepo', branch: 'main' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBe('••••••••');
    expect(res.body.data.repo).toBe('myorg/myrepo');
  });

  it('does not overwrite token when masked placeholder sent', async () => {
    await githubBackupService.saveSettings(db, { enabled: true, token: 'original-token' }, 'sa@test.com');
    const res = await request(app)
      .put('/api/github-backup/settings')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ enabled: false, token: '••••••••' });
    expect(res.status).toBe(200);
    const settings = await githubBackupService.getSettings(db);
    expect(settings.token).toBe('original-token');
  });

  it('rejects non-superadmin', async () => {
    const res = await request(app)
      .put('/api/github-backup/settings')
      .set('Cookie', ['token=' + adminToken()])
      .send({ enabled: true });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/github-backup/test', () => {
  it('returns success when connection is valid', async () => {
    jest.spyOn(githubBackupService, 'testConnection').mockResolvedValueOnce({ name: 'o/r', private: true });
    const res = await request(app)
      .post('/api/github-backup/test')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ token: 'tok', repo: 'o/r' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('o/r');
  });

  it('uses stored token when masked placeholder sent', async () => {
    await githubBackupService.saveSettings(db, { enabled: true, token: 'stored-tok', repo: 'o/r' }, 'sa@test.com');
    const spy = jest.spyOn(githubBackupService, 'testConnection').mockResolvedValueOnce({ name: 'o/r', private: true });
    await request(app)
      .post('/api/github-backup/test')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ token: '••••••••', repo: 'o/r' });
    expect(spy).toHaveBeenCalledWith('stored-tok', 'o/r');
  });

  it('returns 400 on connection failure', async () => {
    jest.spyOn(githubBackupService, 'testConnection').mockRejectedValueOnce(new Error('not private'));
    const res = await request(app)
      .post('/api/github-backup/test')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ token: 'tok', repo: 'o/r' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('not private');
  });

  it('rejects non-superadmin', async () => {
    const res = await request(app)
      .post('/api/github-backup/test')
      .set('Cookie', ['token=' + adminToken()])
      .send({ token: 'tok', repo: 'o/r' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/github-backup/sync', () => {
  it('returns sync result on success', async () => {
    jest.spyOn(githubBackupService, 'syncAll').mockResolvedValueOnce({
      syncedAt: '2026-01-01T00:00:00.000Z',
      commitSha: 'abc123',
      pushed: ['database.sqlite', 'audit.sqlite'],
      pulled: [],
      upToDate: [],
      requiresRestart: false,
    });
    const res = await request(app)
      .post('/api/github-backup/sync')
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.data.commitSha).toBe('abc123');
  });

  it('returns 500 and records failure on error', async () => {
    jest.spyOn(githubBackupService, 'syncAll').mockRejectedValueOnce(new Error('push failed'));
    jest.spyOn(githubBackupService, 'recordFailure').mockResolvedValueOnce();
    const res = await request(app)
      .post('/api/github-backup/sync')
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(500);
    expect(githubBackupService.recordFailure).toHaveBeenCalled();
  });

  it('rejects non-superadmin', async () => {
    const res = await request(app)
      .post('/api/github-backup/sync')
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(403);
  });
});
