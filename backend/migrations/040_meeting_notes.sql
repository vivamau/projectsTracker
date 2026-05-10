CREATE TABLE IF NOT EXISTS meeting_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  note_title TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'meeting',
  note_date INTEGER,
  note_createdate INTEGER NOT NULL,
  note_updatedate INTEGER,
  note_is_deleted INTEGER DEFAULT 0,
  created_by_user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS meeting_note_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  note_id INTEGER NOT NULL REFERENCES meeting_notes(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  link_createdate INTEGER NOT NULL
);
