CREATE TABLE IF NOT EXISTS rag_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  source_type TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL,
  embedding TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rag_embeddings_source ON rag_embeddings (source_type, source_ref);
