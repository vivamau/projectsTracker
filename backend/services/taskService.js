const { runQuery, getOne, getAll } = require('../config/database');

async function getByProjectId(db, projectId) {
  return getAll(db,
    `SELECT t.*,
            u.user_name AS assignee_name, u.user_lastname AS assignee_lastname,
            c.user_name AS creator_name, c.user_lastname AS creator_lastname
     FROM project_tasks t
     LEFT JOIN users u ON t.task_assigned_to_user_id = u.id
     LEFT JOIN users c ON t.created_by_user_id = c.id
     WHERE t.project_id = ? AND (t.task_is_deleted = 0 OR t.task_is_deleted IS NULL)
     ORDER BY t.task_create_date DESC, t.id DESC`,
    [projectId]
  );
}

async function getById(db, id) {
  const task = await getOne(db,
    `SELECT t.*,
            u.user_name AS assignee_name, u.user_lastname AS assignee_lastname,
            c.user_name AS creator_name, c.user_lastname AS creator_lastname
     FROM project_tasks t
     LEFT JOIN users u ON t.task_assigned_to_user_id = u.id
     LEFT JOIN users c ON t.created_by_user_id = c.id
     WHERE t.id = ? AND (t.task_is_deleted = 0 OR t.task_is_deleted IS NULL)`,
    [id]
  );
  if (!task) return null;
  task.followups = await getFollowupsByTaskId(db, id);
  return task;
}

async function create(db, { project_id, task_title, task_description, task_assigned_to_user_id, task_due_date, created_by_user_id }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO project_tasks
       (project_id, task_title, task_description, task_assigned_to_user_id, task_due_date, task_status, task_create_date, task_update_date, created_by_user_id)
     VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
    [project_id, task_title, task_description || null, task_assigned_to_user_id || null, task_due_date || null, now, now, created_by_user_id || null]
  );
}

async function update(db, id, { task_title, task_description, task_assigned_to_user_id, task_due_date, task_status }) {
  const fields = [];
  const values = [];

  if (task_title !== undefined) { fields.push('task_title = ?'); values.push(task_title); }
  if (task_description !== undefined) { fields.push('task_description = ?'); values.push(task_description); }
  if (task_assigned_to_user_id !== undefined) { fields.push('task_assigned_to_user_id = ?'); values.push(task_assigned_to_user_id); }
  if (task_due_date !== undefined) { fields.push('task_due_date = ?'); values.push(task_due_date); }
  if (task_status !== undefined) { fields.push('task_status = ?'); values.push(task_status); }

  if (fields.length === 0) return { changes: 0 };

  fields.push('task_update_date = ?');
  values.push(Date.now());
  values.push(id);

  return runQuery(db,
    `UPDATE project_tasks SET ${fields.join(', ')}
     WHERE id = ? AND (task_is_deleted = 0 OR task_is_deleted IS NULL)`,
    values
  );
}

async function close(db, id) {
  const now = Date.now();
  return runQuery(db,
    `UPDATE project_tasks SET task_status = 'closed', task_close_date = ?, task_update_date = ?
     WHERE id = ? AND (task_is_deleted = 0 OR task_is_deleted IS NULL)`,
    [now, now, id]
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    `UPDATE project_tasks SET task_is_deleted = 1, task_update_date = ?
     WHERE id = ? AND (task_is_deleted = 0 OR task_is_deleted IS NULL)`,
    [Date.now(), id]
  );
}

async function getFollowupsByTaskId(db, taskId) {
  return getAll(db,
    `SELECT f.*, u.user_name AS author_name, u.user_lastname AS author_lastname
     FROM project_task_followups f
     LEFT JOIN users u ON f.user_id = u.id
     WHERE f.task_id = ? AND (f.followup_is_deleted = 0 OR f.followup_is_deleted IS NULL)
     ORDER BY f.followup_create_date DESC, f.id DESC`,
    [taskId]
  );
}

async function createFollowup(db, { task_id, followup_note, user_id }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO project_task_followups (task_id, followup_note, user_id, followup_create_date, followup_update_date)
     VALUES (?, ?, ?, ?, ?)`,
    [task_id, followup_note, user_id || null, now, now]
  );
}

async function updateFollowup(db, id, { followup_note }) {
  return runQuery(db,
    `UPDATE project_task_followups SET followup_note = ?, followup_update_date = ?
     WHERE id = ? AND (followup_is_deleted = 0 OR followup_is_deleted IS NULL)`,
    [followup_note, Date.now(), id]
  );
}

async function deleteFollowup(db, id) {
  return runQuery(db,
    `UPDATE project_task_followups SET followup_is_deleted = 1, followup_update_date = ?
     WHERE id = ? AND (followup_is_deleted = 0 OR followup_is_deleted IS NULL)`,
    [Date.now(), id]
  );
}

module.exports = {
  getByProjectId, getById, create, update, close, softDelete,
  getFollowupsByTaskId, createFollowup, updateFollowup, deleteFollowup,
};
