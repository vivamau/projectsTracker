CREATE TABLE IF NOT EXISTS ai_saved_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_ai_saved_sessions_user_id ON ai_saved_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_saved_sessions_created_at ON ai_saved_sessions(created_at);
