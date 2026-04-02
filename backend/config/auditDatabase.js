const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let auditDb = null;

const AUDIT_SCHEMA = `
  CREATE TABLE IF NOT EXISTS audit_logs (
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
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
`;

function getAuditDb() {
  if (auditDb) return auditDb;

  const dbPath = process.env.AUDIT_DB_PATH || path.join(__dirname, '..', 'data', 'audit.sqlite');
  auditDb = new sqlite3.Database(dbPath);
  auditDb.run('PRAGMA journal_mode = WAL');
  auditDb.exec(AUDIT_SCHEMA);

  return auditDb;
}

function createAuditDb(dbPath) {
  const instance = new sqlite3.Database(dbPath);
  instance.run('PRAGMA journal_mode = WAL');
  instance.exec(AUDIT_SCHEMA);
  return instance;
}

function closeAuditDb() {
  return new Promise((resolve, reject) => {
    if (auditDb) {
      auditDb.close((err) => {
        if (err) reject(err);
        else {
          auditDb = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = { getAuditDb, createAuditDb, closeAuditDb };
