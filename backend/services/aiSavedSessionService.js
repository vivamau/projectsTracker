const { getAll, getOne, runQuery } = require('../config/database');

function buildMarkdown(title, messages) {
  const now = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const userMessages = messages.filter(m => m.role !== 'error');

  const lines = [
    `# ${title}`,
    ``,
    `**Date:** ${now}  `,
    `**Messages:** ${userMessages.length}`,
    ``,
    `---`,
    ``,
  ];

  for (const msg of userMessages) {
    if (msg.role === 'user') {
      lines.push(`**You:** ${msg.content}`, ``);
    } else if (msg.role === 'assistant') {
      lines.push(`**Assistant:** ${msg.content}`, ``, `---`, ``);
    }
  }

  return lines.join('\n');
}

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'session';
}

async function saveSession(db, { userId, sessionId, title, messages }) {
  const clean = messages.filter(m => m.role !== 'error');
  const content = buildMarkdown(title, messages);
  const messagesJson = JSON.stringify(clean);
  const now = Date.now();
  const result = await runQuery(db,
    `INSERT INTO ai_saved_sessions (user_id, session_id, title, content, message_count, messages_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, sessionId, title, content, clean.length, messagesJson, now]
  );
  return { id: result.lastID, title, messageCount: clean.length, createdAt: now };
}

async function listSessions(db, userId) {
  return getAll(db,
    `SELECT id, session_id, title, message_count, created_at,
            (messages_json IS NOT NULL) as can_load
     FROM ai_saved_sessions
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
}

async function getSession(db, id, userId) {
  return getOne(db,
    `SELECT id, session_id, title, content, message_count, messages_json, created_at
     FROM ai_saved_sessions
     WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
}

async function deleteSession(db, id, userId) {
  const result = await runQuery(db,
    `DELETE FROM ai_saved_sessions WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.changes > 0;
}

module.exports = { saveSession, listSessions, getSession, deleteSession, slugify };
