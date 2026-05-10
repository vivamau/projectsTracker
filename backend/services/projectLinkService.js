const { runQuery, getAll } = require('../config/database');

async function getByProjectId(db, projectId) {
  return getAll(db,
    `SELECT * FROM project_links
     WHERE project_id = ? AND (projectlink_is_deleted = 0 OR projectlink_is_deleted IS NULL)
     ORDER BY projectlink_createdate DESC`,
    [projectId]
  );
}

async function create(db, projectId, { projectlink_label, projectlink_URL }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO project_links (project_id, projectlink_label, projectlink_URL, projectlink_createdate)
     VALUES (?, ?, ?, ?)`,
    [projectId, projectlink_label, projectlink_URL, now]
  );
}

async function update(db, linkId, { projectlink_label, projectlink_URL }) {
  const fields = [];
  const params = [];

  if (projectlink_label !== undefined) { fields.push('projectlink_label = ?'); params.push(projectlink_label); }
  if (projectlink_URL !== undefined) { fields.push('projectlink_URL = ?'); params.push(projectlink_URL); }
  if (fields.length === 0) return { changes: 0 };

  fields.push('projectlink_updatedate = ?');
  params.push(Date.now());
  params.push(linkId);

  return runQuery(db,
    `UPDATE project_links SET ${fields.join(', ')}
     WHERE id = ? AND (projectlink_is_deleted = 0 OR projectlink_is_deleted IS NULL)`,
    params
  );
}

async function softDelete(db, linkId) {
  return runQuery(db,
    `UPDATE project_links SET projectlink_is_deleted = 1
     WHERE id = ? AND (projectlink_is_deleted = 0 OR projectlink_is_deleted IS NULL)`,
    [linkId]
  );
}

module.exports = { getByProjectId, create, update, softDelete };
