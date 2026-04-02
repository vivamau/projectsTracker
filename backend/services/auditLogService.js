const { getOne, getAll, runQuery } = require('../config/database');

async function getLogs(auditDb, filters = {}, pagination = {}) {
  const { userEmail, action, entityType, dateFrom, dateTo, search } = filters;
  const page = pagination.page || 1;
  const limit = pagination.limit || 50;
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (userEmail) { conditions.push('user_email = ?'); params.push(userEmail); }
  if (action) { conditions.push('action = ?'); params.push(action); }
  if (entityType) { conditions.push('entity_type = ?'); params.push(entityType); }
  if (dateFrom) { conditions.push('created_at >= ?'); params.push(dateFrom); }
  if (dateTo) { conditions.push('created_at <= ?'); params.push(dateTo); }
  if (search) { conditions.push('details LIKE ?'); params.push(`%${search}%`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return getAll(auditDb,
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
}

async function getLogCount(auditDb, filters = {}) {
  const { userEmail, action, entityType, dateFrom, dateTo, search } = filters;
  const conditions = [];
  const params = [];

  if (userEmail) { conditions.push('user_email = ?'); params.push(userEmail); }
  if (action) { conditions.push('action = ?'); params.push(action); }
  if (entityType) { conditions.push('entity_type = ?'); params.push(entityType); }
  if (dateFrom) { conditions.push('created_at >= ?'); params.push(dateFrom); }
  if (dateTo) { conditions.push('created_at <= ?'); params.push(dateTo); }
  if (search) { conditions.push('details LIKE ?'); params.push(`%${search}%`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const row = await getOne(auditDb, `SELECT COUNT(*) as count FROM audit_logs ${where}`, params);
  return row.count;
}

async function getActionTypes(auditDb) {
  const rows = await getAll(auditDb, 'SELECT DISTINCT action FROM audit_logs ORDER BY action');
  return rows.map(r => r.action);
}

async function getEntityTypes(auditDb) {
  const rows = await getAll(auditDb, 'SELECT DISTINCT entity_type FROM audit_logs WHERE entity_type IS NOT NULL ORDER BY entity_type');
  return rows.map(r => r.entity_type);
}

async function getUserEmails(auditDb) {
  const rows = await getAll(auditDb, 'SELECT DISTINCT user_email FROM audit_logs WHERE user_email IS NOT NULL ORDER BY user_email');
  return rows.map(r => r.user_email);
}

async function cleanup(auditDb, retentionDays) {
  if (!retentionDays || retentionDays === 'never') return 0;
  const cutoff = Date.now() - (parseInt(retentionDays) * 24 * 60 * 60 * 1000);
  const result = await runQuery(auditDb, 'DELETE FROM audit_logs WHERE created_at < ?', [cutoff]);
  return result.changes;
}

module.exports = { getLogs, getLogCount, getActionTypes, getEntityTypes, getUserEmails, cleanup };
