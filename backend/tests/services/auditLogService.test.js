const { createAuditDb } = require('../../config/auditDatabase');
const { auditLog } = require('../../utilities/auditHelper');
const auditLogService = require('../../services/auditLogService');

let auditDb;

beforeAll(async () => {
  auditDb = await new Promise((resolve, reject) => {
    const { Database } = require('sqlite3').verbose();
    const db = new Database(':memory:', (err) => {
      if (err) reject(err);
      else resolve(db);
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
      );
      CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
      CREATE INDEX idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
      CREATE INDEX idx_audit_logs_user_email ON audit_logs(user_email);
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

afterAll(async () => {
  await new Promise((resolve) => auditDb.close(() => resolve()));
});

describe('auditHelper.auditLog', () => {
  it('inserts a log entry', async () => {
    await auditLog(auditDb, {
      userId: 1,
      userEmail: 'admin@test.com',
      action: 'project.create',
      entityType: 'project',
      entityId: 42,
      details: { data: { name: 'Test Project' } },
      ip: '127.0.0.1'
    });

    const rows = await auditLogService.getLogs(auditDb, {});
    expect(rows.length).toBe(1);
    expect(rows[0].user_email).toBe('admin@test.com');
    expect(rows[0].action).toBe('project.create');
    expect(rows[0].entity_type).toBe('project');
    expect(rows[0].entity_id).toBe(42);
    expect(rows[0].ip_address).toBe('127.0.0.1');
    expect(JSON.parse(rows[0].details)).toEqual({ data: { name: 'Test Project' } });
  });

  it('inserts a log entry with minimal fields', async () => {
    await auditLog(auditDb, { action: 'system.startup' });
    const rows = await auditLogService.getLogs(auditDb, { action: 'system.startup' });
    expect(rows.length).toBe(1);
    expect(rows[0].user_email).toBeNull();
  });
});

describe('auditLogService.getLogs', () => {
  beforeEach(async () => {
    await new Promise((resolve, reject) => {
      auditDb.run('DELETE FROM audit_logs', (err) => err ? reject(err) : resolve());
    });

    const now = Date.now();
    await auditLog(auditDb, { userId: 1, userEmail: 'admin@test.com', action: 'project.create', entityType: 'project', entityId: 1, ip: '10.0.0.1' });
    await auditLog(auditDb, { userId: 2, userEmail: 'reader@test.com', action: 'login', entityType: 'auth', ip: '10.0.0.2' });
    await auditLog(auditDb, { userId: 1, userEmail: 'admin@test.com', action: 'poitem.update', entityType: 'poitem', entityId: 5, details: { before: { days: 5 }, after: { days: 10 } }, ip: '10.0.0.1' });
    await auditLog(auditDb, { userId: 1, userEmail: 'admin@test.com', action: 'project.delete', entityType: 'project', entityId: 1, ip: '10.0.0.1' });
  });

  it('returns all logs with no filters', async () => {
    const rows = await auditLogService.getLogs(auditDb, {});
    expect(rows.length).toBe(4);
  });

  it('filters by user_email', async () => {
    const rows = await auditLogService.getLogs(auditDb, { userEmail: 'reader@test.com' });
    expect(rows.length).toBe(1);
    expect(rows[0].action).toBe('login');
  });

  it('filters by action', async () => {
    const rows = await auditLogService.getLogs(auditDb, { action: 'project.create' });
    expect(rows.length).toBe(1);
  });

  it('filters by entity_type', async () => {
    const rows = await auditLogService.getLogs(auditDb, { entityType: 'project' });
    expect(rows.length).toBe(2);
  });

  it('filters by date range', async () => {
    const now = Date.now();
    const future = now + 100000;
    const rows = await auditLogService.getLogs(auditDb, { dateFrom: future });
    expect(rows.length).toBe(0);
  });

  it('filters by search term in details', async () => {
    const rows = await auditLogService.getLogs(auditDb, { search: 'days' });
    expect(rows.length).toBe(1);
    expect(rows[0].action).toBe('poitem.update');
  });

  it('paginates results', async () => {
    const page1 = await auditLogService.getLogs(auditDb, {}, { page: 1, limit: 2 });
    const page2 = await auditLogService.getLogs(auditDb, {}, { page: 2, limit: 2 });
    expect(page1.length).toBe(2);
    expect(page2.length).toBe(2);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it('returns ordered by created_at DESC by default', async () => {
    const rows = await auditLogService.getLogs(auditDb, {});
    expect(rows[0].created_at).toBeGreaterThanOrEqual(rows[1].created_at);
  });
});

describe('auditLogService.getLogCount', () => {
  it('returns total count', async () => {
    await new Promise((resolve, reject) => {
      auditDb.run('DELETE FROM audit_logs', (err) => err ? reject(err) : resolve());
    });
    await auditLog(auditDb, { action: 'test.1' });
    await auditLog(auditDb, { action: 'test.2' });
    const count = await auditLogService.getLogCount(auditDb);
    expect(count).toBe(2);
  });

  it('returns filtered count', async () => {
    const count = await auditLogService.getLogCount(auditDb, { action: 'test.1' });
    expect(count).toBe(1);
  });
});

describe('auditLogService.getActionTypes', () => {
  it('returns distinct action types', async () => {
    await new Promise((resolve, reject) => {
      auditDb.run('DELETE FROM audit_logs', (err) => err ? reject(err) : resolve());
    });
    await auditLog(auditDb, { action: 'project.create' });
    await auditLog(auditDb, { action: 'project.create' });
    await auditLog(auditDb, { action: 'poitem.update' });
    const types = await auditLogService.getActionTypes(auditDb);
    expect(types).toContain('project.create');
    expect(types).toContain('poitem.update');
    expect(types.length).toBe(2);
  });
});

describe('auditLogService.getEntityTypes', () => {
  it('returns distinct entity types', async () => {
    await new Promise((resolve, reject) => {
      auditDb.run('DELETE FROM audit_logs', (err) => err ? reject(err) : resolve());
    });
    await auditLog(auditDb, { action: 'a', entityType: 'project' });
    await auditLog(auditDb, { action: 'b', entityType: 'poitem' });
    const types = await auditLogService.getEntityTypes(auditDb);
    expect(types).toContain('project');
    expect(types).toContain('poitem');
    expect(types.length).toBe(2);
  });
});

describe('auditLogService.getStats', () => {
  beforeEach(async () => {
    await new Promise((resolve, reject) => {
      auditDb.run('DELETE FROM audit_logs', (err) => err ? reject(err) : resolve());
    });
  });

  it('returns grouped stats by action and entity type', async () => {
    await auditLog(auditDb, { action: 'CREATE', entityType: 'project' });
    await auditLog(auditDb, { action: 'CREATE', entityType: 'project' });
    await auditLog(auditDb, { action: 'UPDATE', entityType: 'user' });
    await auditLog(auditDb, { action: 'DELETE', entityType: 'project' });

    const stats = await auditLogService.getStats(auditDb);

    expect(stats.total).toBe(4);
    expect(stats.byAction.length).toBe(3);
    expect(stats.byAction.find(r => r.action === 'CREATE').count).toBe(2);
    expect(stats.byAction.find(r => r.action === 'UPDATE').count).toBe(1);
    expect(stats.byAction.find(r => r.action === 'DELETE').count).toBe(1);
    expect(stats.byEntityType.find(r => r.entity_type === 'project').count).toBe(3);
    expect(stats.byEntityType.find(r => r.entity_type === 'user').count).toBe(1);
  });

  it('returns empty arrays when no logs exist', async () => {
    const stats = await auditLogService.getStats(auditDb);
    expect(stats.total).toBe(0);
    expect(stats.byAction).toEqual([]);
    expect(stats.byEntityType).toEqual([]);
  });
});

describe('auditLogService.cleanup', () => {
  it('deletes logs older than retention days', async () => {
    await new Promise((resolve, reject) => {
      auditDb.run('DELETE FROM audit_logs', (err) => err ? reject(err) : resolve());
    });

    const now = Date.now();
    const oldTimestamp = now - (100 * 24 * 60 * 60 * 1000);
    const recentTimestamp = now - (10 * 24 * 60 * 60 * 1000);

    await new Promise((resolve, reject) => {
      auditDb.run('INSERT INTO audit_logs (action, created_at) VALUES (?, ?)', ['old.action', oldTimestamp], (err) => err ? reject(err) : resolve());
    });
    await new Promise((resolve, reject) => {
      auditDb.run('INSERT INTO audit_logs (action, created_at) VALUES (?, ?)', ['recent.action', recentTimestamp], (err) => err ? reject(err) : resolve());
    });

    const deleted = await auditLogService.cleanup(auditDb, 90);
    expect(deleted).toBe(1);

    const remaining = await auditLogService.getLogs(auditDb, {});
    expect(remaining.length).toBe(1);
    expect(remaining[0].action).toBe('recent.action');
  });

  it('returns 0 when nothing to delete', async () => {
    await new Promise((resolve, reject) => {
      auditDb.run('DELETE FROM audit_logs', (err) => err ? reject(err) : resolve());
    });
    await auditLog(auditDb, { action: 'recent.only' });

    const deleted = await auditLogService.cleanup(auditDb, 90);
    expect(deleted).toBe(0);
  });
});
