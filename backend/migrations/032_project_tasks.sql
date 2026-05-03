CREATE TABLE IF NOT EXISTS project_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_assigned_to_user_id INTEGER,
  task_due_date TEXT,
  task_status TEXT NOT NULL DEFAULT 'open',
  task_close_date INTEGER,
  task_create_date INTEGER,
  task_update_date INTEGER,
  task_is_deleted INTEGER DEFAULT 0,
  created_by_user_id INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (task_assigned_to_user_id) REFERENCES users(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_task_followups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  followup_note TEXT NOT NULL,
  user_id INTEGER,
  followup_create_date INTEGER,
  followup_update_date INTEGER,
  followup_is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (task_id) REFERENCES project_tasks(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
