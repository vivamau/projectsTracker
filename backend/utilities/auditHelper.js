const { runQuery } = require('../config/database');

async function auditLog(auditDb, { userId, userEmail, action, entityType, entityId, details, ip }) {
  await runQuery(auditDb,
    `INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId || null, userEmail || null, action, entityType || null, entityId || null, details ? JSON.stringify(details) : null, ip || null, Date.now()]
  );
}

module.exports = { auditLog };
