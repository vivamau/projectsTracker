const { saveSession, listSessions, getSession, deleteSession, slugify } = require('../../services/aiSavedSessionService');
const { runQuery } = require('../../config/database');

let db;

const SCHEMA = `
  CREATE TABLE ai_saved_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    messages_json TEXT,
    created_at INTEGER NOT NULL
  );
`;

const MESSAGES = [
  { role: 'user',      content: 'How many projects?' },
  { role: 'assistant', content: 'There are 12 active projects.' },
  { role: 'user',      content: 'Which division leads?' },
  { role: 'assistant', content: 'Division Alpha leads with 5 projects.' },
];

beforeAll(async () => {
  db = await new Promise((resolve, reject) => {
    const { Database } = require('sqlite3').verbose();
    const instance = new Database(':memory:', err => err ? reject(err) : resolve(instance));
  });
  await new Promise((resolve, reject) => db.exec(SCHEMA, err => err ? reject(err) : resolve()));
});

afterAll(async () => {
  await new Promise(resolve => db.close(() => resolve()));
});

describe('saveSession', () => {
  it('persists a session and returns metadata', async () => {
    const result = await saveSession(db, { userId: 1, sessionId: 'sid-1', title: 'Test session', messages: MESSAGES });
    expect(result.id).toBeDefined();
    expect(result.title).toBe('Test session');
    expect(result.messageCount).toBe(4);
  });

  it('generates valid markdown content', async () => {
    const result = await saveSession(db, { userId: 2, sessionId: 'sid-2', title: 'MD test', messages: MESSAGES });
    const session = await getSession(db, result.id, 2);
    expect(session.content).toContain('# MD test');
    expect(session.content).toContain('**You:** How many projects?');
    expect(session.content).toContain('**Assistant:** There are 12 active projects.');
  });

  it('ignores messages with unrecognized roles in markdown', async () => {
    const msgs = [
      { role: 'user', content: 'Hello' },
      { role: 'tool', content: 'tool result' },
      { role: 'assistant', content: 'Hi there' },
    ];
    const result = await saveSession(db, { userId: 99, sessionId: 'sid-tool', title: 'Tool test', messages: msgs });
    const session = await getSession(db, result.id, 99);
    expect(session.content).not.toContain('tool result');
    expect(session.content).toContain('**You:** Hello');
    expect(session.content).toContain('**Assistant:** Hi there');
  });

  it('excludes error messages from markdown and count', async () => {
    const msgs = [...MESSAGES, { role: 'error', content: 'Something failed' }];
    const result = await saveSession(db, { userId: 3, sessionId: 'sid-3', title: 'With error', messages: msgs });
    expect(result.messageCount).toBe(4);
    const session = await getSession(db, result.id, 3);
    expect(session.content).not.toContain('Something failed');
  });
});

describe('listSessions', () => {
  it('returns only sessions belonging to the given user', async () => {
    await saveSession(db, { userId: 10, sessionId: 'u10a', title: 'User 10 session A', messages: MESSAGES });
    await saveSession(db, { userId: 10, sessionId: 'u10b', title: 'User 10 session B', messages: MESSAGES });
    await saveSession(db, { userId: 11, sessionId: 'u11a', title: 'User 11 session',   messages: MESSAGES });

    const list = await listSessions(db, 10);
    expect(list.length).toBe(2);
    expect(list.every(s => !s.content)).toBe(true); // content not returned in list
    expect(list[0].title).toBeDefined();
  });

  it('includes can_load flag (true for sessions with messages_json)', async () => {
    const list = await listSessions(db, 10);
    expect(list.every(s => s.can_load === 1)).toBe(true);
  });

  it('orders sessions newest first', async () => {
    const list = await listSessions(db, 10);
    expect(list[0].created_at).toBeGreaterThanOrEqual(list[1].created_at);
  });
});

describe('getSession', () => {
  it('returns the session with content when owner matches', async () => {
    const saved = await saveSession(db, { userId: 20, sessionId: 'gs1', title: 'Get test', messages: MESSAGES });
    const session = await getSession(db, saved.id, 20);
    expect(session).not.toBeNull();
    expect(session.content).toContain('# Get test');
  });

  it('returns null when user_id does not match', async () => {
    const saved = await saveSession(db, { userId: 21, sessionId: 'gs2', title: 'Private', messages: MESSAGES });
    const session = await getSession(db, saved.id, 99);
    expect(session).toBeNull();
  });

  it('stores messages_json and returns parseable messages array', async () => {
    const saved = await saveSession(db, { userId: 22, sessionId: 'gs3', title: 'JSON test', messages: MESSAGES });
    const session = await getSession(db, saved.id, 22);
    expect(session.messages_json).toBeDefined();
    const parsed = JSON.parse(session.messages_json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(4);
    expect(parsed[0]).toEqual({ role: 'user', content: 'How many projects?' });
  });
});

describe('deleteSession', () => {
  it('deletes the session and returns true when owner matches', async () => {
    const saved = await saveSession(db, { userId: 30, sessionId: 'del1', title: 'To delete', messages: MESSAGES });
    const ok = await deleteSession(db, saved.id, 30);
    expect(ok).toBe(true);
    expect(await getSession(db, saved.id, 30)).toBeNull();
  });

  it('returns false when user_id does not match', async () => {
    const saved = await saveSession(db, { userId: 31, sessionId: 'del2', title: 'Protected', messages: MESSAGES });
    const ok = await deleteSession(db, saved.id, 99);
    expect(ok).toBe(false);
    expect(await getSession(db, saved.id, 31)).not.toBeNull();
  });
});

describe('slugify', () => {
  it('converts title to filename-safe slug', () => {
    expect(slugify('My Session 2026!')).toBe('my-session-2026');
    expect(slugify('  leading/trailing  ')).toBe('leading-trailing');
    expect(slugify('')).toBe('session');
  });

  it('truncates to 60 characters', () => {
    expect(slugify('a'.repeat(80)).length).toBeLessThanOrEqual(60);
  });
});
