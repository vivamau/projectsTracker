const aiTokenLogService = require('../../services/aiTokenLogService');

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
      CREATE TABLE ai_token_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_email TEXT,
        session_id TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        message_preview TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX idx_ai_token_logs_session_id ON ai_token_logs(session_id);
      CREATE INDEX idx_ai_token_logs_created_at ON ai_token_logs(created_at);
      CREATE INDEX idx_ai_token_logs_user_email ON ai_token_logs(user_email);
      CREATE INDEX idx_ai_token_logs_model ON ai_token_logs(model);
    `, (err) => { if (err) reject(err); else resolve(); });
  });
});

afterAll(async () => {
  await new Promise(resolve => auditDb.close(() => resolve()));
});

describe('aiTokenLogService.logTokens', () => {
  it('inserts a token log entry', async () => {
    await aiTokenLogService.logTokens(auditDb, {
      userId: 1,
      userEmail: 'test@example.com',
      sessionId: 'sess-001',
      model: 'llama3.2',
      promptTokens: 100,
      completionTokens: 50,
      messagePreview: 'How many projects?',
    });
    const sessions = await aiTokenLogService.getSessions(auditDb, {});
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    const s = sessions.find(x => x.session_id === 'sess-001');
    expect(s).toBeDefined();
    expect(s.user_email).toBe('test@example.com');
    expect(s.model).toBe('llama3.2');
    expect(Number(s.total_prompt_tokens)).toBe(100);
    expect(Number(s.total_completion_tokens)).toBe(50);
    expect(Number(s.message_count)).toBe(1);
  });

  it('truncates message_preview to 120 chars', async () => {
    const longMsg = 'x'.repeat(200);
    await aiTokenLogService.logTokens(auditDb, {
      sessionId: 'sess-trunc', model: 'llama3.2',
      promptTokens: 10, completionTokens: 5, messagePreview: longMsg,
    });
    const msgs = await aiTokenLogService.getMessages(auditDb, 'sess-trunc');
    expect(msgs[0].message_preview.length).toBe(120);
  });
});

describe('aiTokenLogService.getSessions', () => {
  it('aggregates multiple messages in a session', async () => {
    await aiTokenLogService.logTokens(auditDb, { sessionId: 'sess-agg', model: 'llama3.2', promptTokens: 80, completionTokens: 40 });
    await aiTokenLogService.logTokens(auditDb, { sessionId: 'sess-agg', model: 'llama3.2', promptTokens: 60, completionTokens: 30 });

    const sessions = await aiTokenLogService.getSessions(auditDb, {});
    const s = sessions.find(x => x.session_id === 'sess-agg');
    expect(Number(s.message_count)).toBe(2);
    expect(Number(s.total_prompt_tokens)).toBe(140);
    expect(Number(s.total_completion_tokens)).toBe(70);
  });

  it('filters by model', async () => {
    await aiTokenLogService.logTokens(auditDb, { sessionId: 'sess-model', model: 'mistral', promptTokens: 20, completionTokens: 10 });
    const sessions = await aiTokenLogService.getSessions(auditDb, { model: 'mistral' });
    expect(sessions.every(s => s.model === 'mistral')).toBe(true);
  });
});

describe('aiTokenLogService.getSessionCount', () => {
  it('returns the number of distinct sessions', async () => {
    const count = await aiTokenLogService.getSessionCount(auditDb, {});
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe('aiTokenLogService.getStats', () => {
  it('returns totals and byModel breakdown', async () => {
    const stats = await aiTokenLogService.getStats(auditDb, {});
    expect(stats.totals).toBeDefined();
    expect(stats.byModel).toBeDefined();
    expect(Array.isArray(stats.byModel)).toBe(true);
    expect(stats.filterOptions.models).toBeDefined();
    expect(typeof Number(stats.totals.total_messages)).toBe('number');
  });
});

describe('aiTokenLogService.getMessages', () => {
  it('returns individual messages for a session in order', async () => {
    await aiTokenLogService.logTokens(auditDb, { sessionId: 'sess-msgs', model: 'llama3.2', promptTokens: 10, completionTokens: 5, messagePreview: 'first' });
    await aiTokenLogService.logTokens(auditDb, { sessionId: 'sess-msgs', model: 'llama3.2', promptTokens: 20, completionTokens: 8, messagePreview: 'second' });

    const msgs = await aiTokenLogService.getMessages(auditDb, 'sess-msgs');
    expect(msgs.length).toBe(2);
    expect(msgs[0].message_preview).toBe('first');
    expect(msgs[1].message_preview).toBe('second');
  });
});
