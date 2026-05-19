jest.mock('../../services/meetingNoteService', () => ({
  getContent: jest.fn(async () => 'note file body'),
}));

const { initTestDb, closeTestDb } = require('../helpers/testDb');
const { runQuery, getOne } = require('../../config/database');
const meetingNoteService = require('../../services/meetingNoteService');
const ragService = require('../../services/ragService');

let db;

beforeAll(async () => { db = await initTestDb(); });
afterAll(async () => { await closeTestDb(db); });

beforeEach(async () => {
  await runQuery(db, 'DELETE FROM rag_embeddings');
  await runQuery(db, 'DELETE FROM meeting_notes');
  meetingNoteService.getContent.mockClear();
  global.fetch = jest.fn();
});

afterEach(() => { delete global.fetch; });

describe('ragService.getSettings / saveSettings', () => {
  it('returns defaults when nothing stored', async () => {
    const s = await ragService.getSettings(db);
    expect(s.ollamaUrl).toBe('http://localhost:11434');
    expect(s.embeddingModel).toBe('embeddinggemma');
    expect(s.lastRun).toBeNull();
    expect(s.lastStatus).toBeNull();
    expect(s.chunkCount).toBe(0);
  });

  it('persists and reads back the embedding model', async () => {
    await ragService.saveSettings(db, { embeddingModel: 'gemma3n:e4b' });
    const s = await ragService.getSettings(db);
    expect(s.embeddingModel).toBe('gemma3n:e4b');
  });

  it('ignores undefined embeddingModel on save', async () => {
    await ragService.saveSettings(db, { embeddingModel: 'keep-me' });
    await ragService.saveSettings(db, {});
    await ragService.saveSettings(db);
    const s = await ragService.getSettings(db);
    expect(s.embeddingModel).toBe('keep-me');
  });

  it('ignores null and blank embeddingModel on save', async () => {
    await ragService.saveSettings(db, { embeddingModel: 'keep-me' });
    await ragService.saveSettings(db, { embeddingModel: null });
    await ragService.saveSettings(db, { embeddingModel: '   ' });
    const s = await ragService.getSettings(db);
    expect(s.embeddingModel).toBe('keep-me');
  });

  it('exposes lastRun/lastStatus once a run has happened', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ embedding: [1] }) });
    await ragService.runLearningPhase(db);
    const s = await ragService.getSettings(db);
    expect(s.lastRun).toBeGreaterThan(0);
    expect(s.lastStatus).toMatch(/success/i);
  });

  it('reflects stored ollama url from agent settings', async () => {
    await runQuery(db,
      `INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES ('agent_ollama_url', 'http://host:9999', ?)
       ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value`,
      [Date.now()]);
    const s = await ragService.getSettings(db);
    expect(s.ollamaUrl).toBe('http://host:9999');
  });
});

describe('ragService.checkHealth', () => {
  it('reports ollama available and model present', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'embeddinggemma:latest' }, { name: 'llama3.2' }] }),
    });
    const r = await ragService.checkHealth('http://localhost:11434', 'embeddinggemma');
    expect(r.ollamaAvailable).toBe(true);
    expect(r.modelAvailable).toBe(true);
    expect(r.models).toContain('embeddinggemma:latest');
  });

  it('reports model missing when not in list', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3.2' }] }),
    });
    const r = await ragService.checkHealth('http://localhost:11434', 'embeddinggemma');
    expect(r.ollamaAvailable).toBe(true);
    expect(r.modelAvailable).toBe(false);
  });

  it('reports ollama unavailable when fetch throws', async () => {
    global.fetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const r = await ragService.checkHealth('http://localhost:11434', 'embeddinggemma');
    expect(r.ollamaAvailable).toBe(false);
    expect(r.modelAvailable).toBe(false);
    expect(r.models).toEqual([]);
  });

  it('reports ollama unavailable on non-ok response', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({}) });
    const r = await ragService.checkHealth('http://localhost:11434', 'embeddinggemma');
    expect(r.ollamaAvailable).toBe(false);
  });
});

describe('ragService.chunkText', () => {
  it('returns [] for empty/whitespace', () => {
    expect(ragService.chunkText('')).toEqual([]);
    expect(ragService.chunkText('   ')).toEqual([]);
  });

  it('splits long text into bounded chunks', () => {
    const text = 'a'.repeat(2500);
    const chunks = ragService.chunkText(text, 1000);
    expect(chunks.length).toBe(3);
    expect(chunks[0].length).toBe(1000);
    expect(chunks.join('').length).toBe(2500);
  });

  it('keeps short text as a single chunk', () => {
    expect(ragService.chunkText('hello world', 1000)).toEqual(['hello world']);
  });
});

describe('ragService.embed', () => {
  it('returns the embedding vector', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ embedding: [0.1, 0.2, 0.3] }) });
    const v = await ragService.embed('http://localhost:11434', 'embeddinggemma', 'hello');
    expect(v).toEqual([0.1, 0.2, 0.3]);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/embeddings',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws on non-ok response', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });
    await expect(ragService.embed('http://localhost:11434', 'm', 'x')).rejects.toThrow(/500/);
  });
});

describe('ragService.gatherCorpus', () => {
  it('collects notes and database tables', async () => {
    await runQuery(db,
      `INSERT INTO meeting_notes (note_title, note_type, note_createdate) VALUES ('Kickoff', 'meeting', ?)`,
      [Date.now()]);
    const corpus = await ragService.gatherCorpus(db);
    const note = corpus.find(c => c.source_type === 'note');
    expect(note).toBeDefined();
    expect(note.text).toContain('Kickoff');
    expect(note.text).toContain('note file body');
    expect(meetingNoteService.getContent).toHaveBeenCalled();
    expect(corpus.some(c => c.source_type === 'table')).toBe(true);
    // excluded internal tables must not appear
    expect(corpus.some(c => c.source_ref === 'rag_embeddings')).toBe(false);
    expect(corpus.some(c => c.source_ref === '_migrations')).toBe(false);
  });

  it('still includes the note when reading its file body fails', async () => {
    meetingNoteService.getContent.mockRejectedValueOnce(new Error('ENOENT'));
    await runQuery(db,
      `INSERT INTO meeting_notes (note_title, note_type, note_createdate) VALUES ('Lonely', 'meeting', ?)`,
      [Date.now()]);
    const corpus = await ragService.gatherCorpus(db);
    const note = corpus.find(c => c.source_type === 'note');
    expect(note.text).toContain('Lonely');
  });
});

describe('ragService.runLearningPhase', () => {
  it('embeds corpus, stores chunks, records status', async () => {
    await runQuery(db,
      `INSERT INTO meeting_notes (note_title, note_type, note_createdate) VALUES ('Note A', 'meeting', ?)`,
      [Date.now()]);
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ embedding: [1, 2, 3] }) });

    const result = await ragService.runLearningPhase(db);
    expect(result.chunks).toBeGreaterThan(0);
    expect(result.sources).toBeGreaterThan(0);

    const row = await getOne(db, 'SELECT COUNT(*) AS n FROM rag_embeddings');
    expect(row.n).toBe(result.chunks);

    const status = await ragService.getStatus(db);
    expect(status.lastRun).toBeGreaterThan(0);
    expect(status.lastStatus).toMatch(/success/i);
    expect(status.chunkCount).toBe(result.chunks);
  });

  it('clears previous embeddings before re-running', async () => {
    await runQuery(db,
      `INSERT INTO rag_embeddings (source_type, source_ref, chunk_index, chunk_text, embedding, created_at)
       VALUES ('stale', 'x', 0, 'old', '[]', ?)`, [Date.now()]);
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ embedding: [1] }) });

    await ragService.runLearningPhase(db);
    const stale = await getOne(db, "SELECT COUNT(*) AS n FROM rag_embeddings WHERE source_type = 'stale'");
    expect(stale.n).toBe(0);
  });

  it('records an error status and rethrows when embedding fails', async () => {
    await runQuery(db,
      `INSERT INTO meeting_notes (note_title, note_type, note_createdate) VALUES ('Bad', 'meeting', ?)`,
      [Date.now()]);
    global.fetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'down' });

    await expect(ragService.runLearningPhase(db)).rejects.toThrow();
    const status = await ragService.getStatus(db);
    expect(status.lastStatus).toMatch(/error/i);
  });
});

describe('ragService.cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(ragService.cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });
  it('returns 0 for orthogonal vectors', () => {
    expect(ragService.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it('returns 0 when a vector is empty or zero', () => {
    expect(ragService.cosineSimilarity([], [1, 2])).toBe(0);
    expect(ragService.cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });
});

describe('ragService.retrieve', () => {
  async function seedChunk(text, vec) {
    await runQuery(db,
      `INSERT INTO rag_embeddings (source_type, source_ref, chunk_index, chunk_text, embedding, created_at)
       VALUES ('note', '1', 0, ?, ?, ?)`,
      [text, JSON.stringify(vec), Date.now()]);
  }

  it('returns [] when the index is empty (no fetch call)', async () => {
    const r = await ragService.retrieve(db, 'anything');
    expect(r).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('ranks chunks by cosine similarity to the question', async () => {
    await seedChunk('about cats', [1, 0, 0]);
    await seedChunk('about dogs', [0, 1, 0]);
    await seedChunk('about birds', [0, 0, 1]);
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ embedding: [0.9, 0.1, 0] }) });

    const r = await ragService.retrieve(db, 'feline question', 2);
    expect(r).toHaveLength(2);
    expect(r[0].chunk_text).toBe('about cats');
    expect(r[0].score).toBeGreaterThan(r[1].score);
  });

  it('returns [] defensively when the question embedding fails', async () => {
    await seedChunk('x', [1, 0]);
    global.fetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'down' });
    const r = await ragService.retrieve(db, 'q');
    expect(r).toEqual([]);
  });
});

describe('ragService.retrieveContext', () => {
  it('returns "" when nothing is indexed', async () => {
    const ctx = await ragService.retrieveContext(db, 'q');
    expect(ctx).toBe('');
  });

  it('formats retrieved chunks into a context block', async () => {
    await runQuery(db,
      `INSERT INTO rag_embeddings (source_type, source_ref, chunk_index, chunk_text, embedding, created_at)
       VALUES ('note', '7', 0, 'Quarterly review notes', ?, ?)`,
      [JSON.stringify([1, 0]), Date.now()]);
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ embedding: [1, 0] }) });

    const ctx = await ragService.retrieveContext(db, 'review');
    expect(ctx).toContain('Quarterly review notes');
    expect(ctx).toContain('note');
  });

  it('never throws — returns "" on internal error', async () => {
    const ctx = await ragService.retrieveContext(null, 'q');
    expect(ctx).toBe('');
  });
});

describe('ragService.retrieveWithContext', () => {
  it('returns empty context and [] sources when nothing indexed', async () => {
    const r = await ragService.retrieveWithContext(db, 'q');
    expect(r).toEqual({ context: '', sources: [] });
  });

  it('returns both the formatted context and structured sources', async () => {
    await runQuery(db,
      `INSERT INTO rag_embeddings (source_type, source_ref, chunk_index, chunk_text, embedding, created_at)
       VALUES ('note', '7', 0, 'Quarterly review notes', ?, ?)`,
      [JSON.stringify([1, 0]), Date.now()]);
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ embedding: [1, 0] }) });

    const r = await ragService.retrieveWithContext(db, 'review');
    expect(r.context).toContain('Quarterly review notes');
    expect(r.sources).toHaveLength(1);
    expect(r.sources[0]).toMatchObject({ source_type: 'note', source_ref: '7' });
    expect(typeof r.sources[0].score).toBe('number');
  });

  it('never throws — returns empty shape on internal error', async () => {
    const r = await ragService.retrieveWithContext(null, 'q');
    expect(r).toEqual({ context: '', sources: [] });
  });
});
