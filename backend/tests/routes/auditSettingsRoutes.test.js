const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { TEST_SECRET, superadminToken, adminToken, readerToken } = require('../helpers/testAuth');
const createSettingsRoutes = require('../../routes/settingsRoutes');
const createAuditLogRoutes = require('../../routes/auditLogRoutes');
const { auditLog } = require('../../utilities/auditHelper');
const auditLogService = require('../../services/auditLogService');

let db, auditDb, app;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_SECRET;
  db = await initTestDb();
  await seedTestDb(db);

  auditDb = await new Promise((resolve, reject) => {
    const { Database } = require('sqlite3').verbose();
    const instance = new Database(':memory:', (err) => {
      if (err) reject(err);
      else resolve(instance);
    });
  });

  await new Promise((resolve, reject) => {
    auditDb.exec(`
      CREATE TABLE audit_logs (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_email TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at INTEGER NOT NULL
      )
    `, (err) => err ? reject(err) : resolve());
  });

  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/settings', createSettingsRoutes(db, auditDb));
  app.use('/api/audit-logs', createAuditLogRoutes(db, auditDb));
});

afterAll(async () => {
  await closeTestDb(db);
  await new Promise((resolve) => auditDb.close(() => resolve()));
});

describe('GET /api/settings', () => {
  it('returns all settings for superadmin', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('rejects non-superadmin (admin)', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(403);
  });

  it('rejects reader', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Cookie', ['token=' + readerToken()]);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/settings/:key', () => {
  it('updates a setting for superadmin', async () => {
    const res = await request(app)
      .put('/api/settings/audit_retention_days')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ value: '180' });
    expect(res.status).toBe(200);
    expect(res.body.data.setting_value).toBe('180');
  });

  it('rejects non-superadmin', async () => {
    const res = await request(app)
      .put('/api/settings/audit_retention_days')
      .set('Cookie', ['token=' + adminToken()])
      .send({ value: '30' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when value is missing', async () => {
    const res = await request(app)
      .put('/api/settings/audit_retention_days')
      .set('Cookie', ['token=' + superadminToken()])
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/settings/public/:key', () => {
  beforeAll(async () => {
    const appSettingsService = require('../../services/appSettingsService');
    await appSettingsService.set(db, 'avatar_style', 'fun-emoji', 'superadmin@test.com');
  });

  it('returns a public setting for any authenticated user', async () => {
    const res = await request(app)
      .get('/api/settings/public/avatar_style')
      .set('Cookie', ['token=' + readerToken()]);
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe('fun-emoji');
  });

  it('returns a public setting for admin', async () => {
    const res = await request(app)
      .get('/api/settings/public/avatar_style')
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe('fun-emoji');
  });

  it('returns null for non-existent key', async () => {
    const res = await request(app)
      .get('/api/settings/public/nonexistent_key')
      .set('Cookie', ['token=' + readerToken()]);
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBeNull();
  });

  it('returns setting for unauthenticated requests (truly public)', async () => {
    const res = await request(app)
      .get('/api/settings/public/avatar_style');
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe('fun-emoji');
  });
});

describe('GET /api/audit-logs', () => {
  beforeEach(async () => {
    await new Promise((resolve, reject) => {
      auditDb.run('DELETE FROM audit_logs', (err) => err ? reject(err) : resolve());
    });
    await auditLog(auditDb, { userId: 1, userEmail: 'superadmin@test.com', action: 'project.create', entityType: 'project', entityId: 1 });
    await auditLog(auditDb, { userId: 2, userEmail: 'admin@test.com', action: 'poitem.update', entityType: 'poitem', entityId: 5 });
    await auditLog(auditDb, { userId: 1, userEmail: 'superadmin@test.com', action: 'login' });
  });

  it('returns paginated logs for superadmin', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.data.logs.length).toBe(3);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.page).toBe(1);
  });

  it('supports pagination params', async () => {
    const res = await request(app)
      .get('/api/audit-logs?page=1&limit=2')
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.data.logs.length).toBe(2);
    expect(res.body.data.total).toBe(3);
  });

  it('supports filters', async () => {
    const res = await request(app)
      .get('/api/audit-logs?action=project.create')
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.data.logs.length).toBe(1);
    expect(res.body.data.total).toBe(1);
  });

  it('rejects non-superadmin', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/audit-logs/filters', () => {
  it('returns filter options for superadmin', async () => {
    const res = await request(app)
      .get('/api/audit-logs/filters')
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.data.actions).toBeDefined();
    expect(res.body.data.entityTypes).toBeDefined();
    expect(res.body.data.userEmails).toBeDefined();
  });
});

describe('GET /api/audit-logs/stats', () => {
  it('returns log stats for superadmin', async () => {
    const res = await request(app)
      .get('/api/audit-logs/stats')
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeDefined();
    expect(res.body.data.byAction).toBeDefined();
    expect(res.body.data.byEntityType).toBeDefined();
  });
});

describe('POST /api/audit-logs/cleanup', () => {
  it('triggers cleanup for superadmin', async () => {
    const res = await request(app)
      .post('/api/audit-logs/cleanup')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ retentionDays: 90 });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBeDefined();
  });

  it('uses setting retention when no body sent', async () => {
    const res = await request(app)
      .post('/api/audit-logs/cleanup')
      .set('Cookie', ['token=' + superadminToken()]);
    expect(res.status).toBe(200);
  });

  it('rejects non-superadmin', async () => {
    const res = await request(app)
      .post('/api/audit-logs/cleanup')
      .set('Cookie', ['token=' + adminToken()]);
    expect(res.status).toBe(403);
  });
});
