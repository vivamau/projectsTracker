const { runQuery, getOne, getAll } = require('../config/database');

async function getByProjectId(db, projectId) {
  return getAll(db,
    `SELECT c.*, u.user_name, u.user_lastname
     FROM completions c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.project_id = ? AND (c.completion_is_deleted = 0 OR c.completion_is_deleted IS NULL)
     ORDER BY c.completion_create_date DESC, c.id DESC`,
    [projectId]
  );
}

async function getLatest(db, projectId) {
  const result = await getOne(db,
    `SELECT * FROM completions
     WHERE project_id = ? AND (completion_is_deleted = 0 OR completion_is_deleted IS NULL)
     ORDER BY completion_create_date DESC, id DESC LIMIT 1`,
    [projectId]
  );
  return result || null;
}

async function create(db, { project_id, completion_value, completion_comment, user_id }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO completions (completion_value, completion_comment, completion_create_date, completion_update_date, project_id, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [completion_value, completion_comment || null, now, now, project_id, user_id || null]
  );
}

async function update(db, id, { completion_value, completion_comment }) {
  const fields = [];
  const values = [];

  if (completion_value !== undefined) {
    fields.push('completion_value = ?');
    values.push(completion_value);
  }
  if (completion_comment !== undefined) {
    fields.push('completion_comment = ?');
    values.push(completion_comment);
  }

  if (fields.length === 0) return { changes: 0 };

  fields.push('completion_update_date = ?');
  values.push(Date.now());
  values.push(id);

  return runQuery(db,
    `UPDATE completions SET ${fields.join(', ')} WHERE id = ? AND (completion_is_deleted = 0 OR completion_is_deleted IS NULL)`,
    values
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    'UPDATE completions SET completion_is_deleted = 1, completion_update_date = ? WHERE id = ? AND (completion_is_deleted = 0 OR completion_is_deleted IS NULL)',
    [Date.now(), id]
  );
}

module.exports = { getByProjectId, getLatest, create, update, softDelete };
