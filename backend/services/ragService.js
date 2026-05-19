const { getOne, getAll, runQuery } = require('../config/database');
const meetingNoteService = require('./meetingNoteService');

const KEYS = {
  embeddingModel: 'rag_embedding_model',
  ollamaUrl:      'agent_ollama_url',
  lastRun:        'rag_last_run',
  lastStatus:     'rag_last_status',
};

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_EMBEDDING_MODEL = 'embeddinggemma';
const CHUNK_SIZE = 1000;
const ROW_CAP = 500;

// Internal / noisy tables that should never be embedded
const EXCLUDED_TABLES = new Set([
  '_migrations', 'rag_embeddings', 'audit_logs', 'ai_token_logs',
  'password_resets', 'meeting_notes', 'meeting_note_entities',
  'ai_saved_sessions',
]);

async function getSetting(db, key) {
  const row = await getOne(db, 'SELECT setting_value FROM app_settings WHERE setting_key = ?', [key]);
  return row ? row.setting_value : null;
}

async function setSetting(db, key, value) {
  return runQuery(db,
    `INSERT INTO app_settings (setting_key, setting_value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at`,
    [key, value, Date.now()]
  );
}

async function getChunkCount(db) {
  const row = await getOne(db, 'SELECT COUNT(*) AS n FROM rag_embeddings');
  return row ? row.n : 0;
}

async function getSettings(db) {
  const [embeddingModel, ollamaUrl, lastRun, lastStatus] = await Promise.all([
    getSetting(db, KEYS.embeddingModel),
    getSetting(db, KEYS.ollamaUrl),
    getSetting(db, KEYS.lastRun),
    getSetting(db, KEYS.lastStatus),
  ]);
  return {
    ollamaUrl: ollamaUrl || DEFAULT_OLLAMA_URL,
    embeddingModel: embeddingModel || DEFAULT_EMBEDDING_MODEL,
    lastRun: lastRun ? parseInt(lastRun, 10) : null,
    lastStatus: lastStatus || null,
    chunkCount: await getChunkCount(db),
  };
}

async function saveSettings(db, { embeddingModel } = {}) {
  if (embeddingModel !== undefined && embeddingModel !== null && String(embeddingModel).trim() !== '') {
    await setSetting(db, KEYS.embeddingModel, String(embeddingModel).trim());
  }
}

async function checkHealth(ollamaUrl, embeddingModel) {
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ollamaAvailable: false, modelAvailable: false, models: [] };
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    const modelAvailable = models.some(
      n => n === embeddingModel || n.startsWith(`${embeddingModel}:`)
    );
    return { ollamaAvailable: true, modelAvailable, models };
  } catch {
    return { ollamaAvailable: false, modelAvailable: false, models: [] };
  }
}

async function embed(ollamaUrl, model, text) {
  const res = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.status);
    throw new Error(`Embedding request failed (${res.status}): ${detail}`);
  }
  const data = await res.json();
  return data.embedding || [];
}

function chunkText(text, size = CHUNK_SIZE) {
  if (!text || !text.trim()) return [];
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

async function gatherCorpus(db) {
  const corpus = [];

  const notes = await getAll(db,
    `SELECT id, note_title FROM meeting_notes
     WHERE (note_is_deleted = 0 OR note_is_deleted IS NULL)`);
  for (const n of notes) {
    let body = '';
    try { body = await meetingNoteService.getContent(db, n.id); } catch { body = ''; }
    corpus.push({
      source_type: 'note',
      source_ref: String(n.id),
      text: `${n.note_title}\n${body || ''}`.trim(),
    });
  }

  const tables = await getAll(db,
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`);
  for (const { name } of tables) {
    if (EXCLUDED_TABLES.has(name)) continue;
    let rows = [];
    try { rows = await getAll(db, `SELECT * FROM "${name}" LIMIT ${ROW_CAP}`); } catch { continue; }
    if (rows.length === 0) continue;
    const text = rows
      .map(r => Object.entries(r)
        .filter(([, v]) => v !== null && v !== '')
        .map(([k, v]) => `${k}=${v}`)
        .join('; '))
      .filter(Boolean)
      .map(line => `${name}: ${line}`)
      .join('\n');
    if (text.trim()) {
      corpus.push({ source_type: 'table', source_ref: name, text });
    }
  }

  return corpus;
}

async function runLearningPhase(db) {
  const startedAt = Date.now();
  const { ollamaUrl, embeddingModel } = await getSettings(db);
  try {
    await runQuery(db, 'DELETE FROM rag_embeddings');
    const corpus = await gatherCorpus(db);
    let chunkCount = 0;
    for (const item of corpus) {
      const chunks = chunkText(item.text);
      for (let i = 0; i < chunks.length; i++) {
        const vector = await embed(ollamaUrl, embeddingModel, chunks[i]);
        await runQuery(db,
          `INSERT INTO rag_embeddings (source_type, source_ref, chunk_index, chunk_text, embedding, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [item.source_type, item.source_ref, i, chunks[i], JSON.stringify(vector), Date.now()]
        );
        chunkCount++;
      }
    }
    const durationMs = Date.now() - startedAt;
    await setSetting(db, KEYS.lastRun, String(Date.now()));
    await setSetting(db, KEYS.lastStatus,
      `success: ${chunkCount} chunks from ${corpus.length} sources`);
    return { chunks: chunkCount, sources: corpus.length, durationMs };
  } catch (err) {
    await setSetting(db, KEYS.lastRun, String(Date.now()));
    await setSetting(db, KEYS.lastStatus, `error: ${err.message}`);
    throw err;
  }
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function retrieve(db, question, k = 5) {
  if (await getChunkCount(db) === 0) return [];
  const { ollamaUrl, embeddingModel } = await getSettings(db);
  let qVec;
  try {
    qVec = await embed(ollamaUrl, embeddingModel, question);
  } catch {
    return [];
  }
  if (!qVec || qVec.length === 0) return [];

  const rows = await getAll(db,
    'SELECT source_type, source_ref, chunk_text, embedding FROM rag_embeddings');
  return rows
    .map(r => {
      let vec;
      try { vec = JSON.parse(r.embedding); } catch { vec = null; }
      return {
        source_type: r.source_type,
        source_ref: r.source_ref,
        chunk_text: r.chunk_text,
        score: cosineSimilarity(qVec, vec),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

async function retrieveWithContext(db, question, k = 5) {
  try {
    const hits = await retrieve(db, question, k);
    if (hits.length === 0) return { context: '', sources: [] };
    const blocks = hits
      .map(h => `[${h.source_type}:${h.source_ref}] ${h.chunk_text}`)
      .join('\n\n');
    const context = `Use the following context from the knowledge base (meeting notes and project data) to answer the question. If it is not relevant, ignore it.\n\n${blocks}`;
    const sources = hits.map(h => ({
      source_type: h.source_type,
      source_ref: h.source_ref,
      score: h.score,
    }));
    return { context, sources };
  } catch {
    return { context: '', sources: [] };
  }
}

async function retrieveContext(db, question, k = 5) {
  const { context } = await retrieveWithContext(db, question, k);
  return context;
}

async function getStatus(db) {
  const [lastRun, lastStatus] = await Promise.all([
    getSetting(db, KEYS.lastRun),
    getSetting(db, KEYS.lastStatus),
  ]);
  return {
    lastRun: lastRun ? parseInt(lastRun, 10) : null,
    lastStatus: lastStatus || null,
    chunkCount: await getChunkCount(db),
  };
}

module.exports = {
  getSettings, saveSettings, checkHealth, embed,
  chunkText, gatherCorpus, runLearningPhase, getStatus,
  cosineSimilarity, retrieve, retrieveContext, retrieveWithContext,
};
