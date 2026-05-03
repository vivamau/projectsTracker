const { getAll, getOne, runQuery } = require('../config/database');

const PREVIEW_LEN = 120;

async function logTokens(auditDb, { userId, userEmail, sessionId, model, promptTokens, completionTokens, messagePreview }) {
  const preview = messagePreview ? messagePreview.slice(0, PREVIEW_LEN) : null;
  return runQuery(auditDb,
    `INSERT INTO ai_token_logs (user_id, user_email, session_id, model, prompt_tokens, completion_tokens, message_preview, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId || null, userEmail || null, sessionId, model, promptTokens || 0, completionTokens || 0, preview, Date.now()]
  );
}

function buildConditions(filters) {
  const { userEmail, model, dateFrom, dateTo } = filters;
  const conditions = [];
  const params = [];
  if (userEmail) { conditions.push('user_email = ?'); params.push(userEmail); }
  if (model)     { conditions.push('model = ?');      params.push(model); }
  if (dateFrom)  { conditions.push('created_at >= ?'); params.push(dateFrom); }
  if (dateTo)    { conditions.push('created_at <= ?'); params.push(dateTo); }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function getSessions(auditDb, filters = {}, pagination = {}) {
  const page  = pagination.page  || 1;
  const limit = pagination.limit || 50;
  const offset = (page - 1) * limit;
  const { where, params } = buildConditions(filters);

  return getAll(auditDb,
    `SELECT
       session_id,
       user_email,
       model,
       COUNT(*) AS message_count,
       SUM(prompt_tokens) AS total_prompt_tokens,
       SUM(completion_tokens) AS total_completion_tokens,
       MIN(created_at) AS started_at,
       MAX(created_at) AS last_at
     FROM ai_token_logs
     ${where}
     GROUP BY session_id
     ORDER BY last_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
}

async function getSessionCount(auditDb, filters = {}) {
  const { where, params } = buildConditions(filters);
  const row = await getOne(auditDb,
    `SELECT COUNT(DISTINCT session_id) AS count FROM ai_token_logs ${where}`,
    params
  );
  return row ? row.count : 0;
}

async function getMessages(auditDb, sessionId) {
  return getAll(auditDb,
    `SELECT id, user_email, model, prompt_tokens, completion_tokens, message_preview, created_at
     FROM ai_token_logs
     WHERE session_id = ?
     ORDER BY created_at ASC`,
    [sessionId]
  );
}

async function getStats(auditDb, filters = {}) {
  const { where, params } = buildConditions(filters);

  const [totals, byModel, userEmails, models] = await Promise.all([
    getOne(auditDb,
      `SELECT COUNT(*) AS total_messages,
              COUNT(DISTINCT session_id) AS total_sessions,
              COUNT(DISTINCT user_email) AS total_users,
              SUM(prompt_tokens) AS total_prompt_tokens,
              SUM(completion_tokens) AS total_completion_tokens
       FROM ai_token_logs ${where}`,
      params
    ),
    getAll(auditDb,
      `SELECT model,
              COUNT(*) AS message_count,
              COUNT(DISTINCT session_id) AS session_count,
              SUM(prompt_tokens) AS prompt_tokens,
              SUM(completion_tokens) AS completion_tokens
       FROM ai_token_logs ${where}
       GROUP BY model ORDER BY prompt_tokens DESC`,
      params
    ),
    getAll(auditDb, 'SELECT DISTINCT user_email FROM ai_token_logs WHERE user_email IS NOT NULL ORDER BY user_email'),
    getAll(auditDb, 'SELECT DISTINCT model FROM ai_token_logs ORDER BY model'),
  ]);

  return {
    totals: totals || { total_messages: 0, total_sessions: 0, total_users: 0, total_prompt_tokens: 0, total_completion_tokens: 0 },
    byModel,
    filterOptions: {
      userEmails: userEmails.map(r => r.user_email),
      models: models.map(r => r.model),
    },
  };
}

module.exports = { logTokens, getSessions, getSessionCount, getMessages, getStats };
