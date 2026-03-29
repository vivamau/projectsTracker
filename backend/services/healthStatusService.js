const { runQuery, getOne, getAll } = require('../config/database');

async function getByProjectId(db, projectId) {
  return getAll(db,
    'SELECT * FROM healthstatuses WHERE project_id = ? ORDER BY healthstatus_create_date DESC, id DESC',
    [projectId]
  );
}

async function getLatest(db, projectId) {
  return getOne(db,
    'SELECT * FROM healthstatuses WHERE project_id = ? ORDER BY healthstatus_create_date DESC, id DESC LIMIT 1',
    [projectId]
  );
}

async function create(db, { project_id, healthstatus_value, healthstatus_comment }) {
  const now = Date.now();
  return runQuery(db,
    'INSERT INTO healthstatuses (healthstatus_value, healthstatus_comment, healthstatus_create_date, project_id) VALUES (?, ?, ?, ?)',
    [healthstatus_value, healthstatus_comment || null, now, project_id]
  );
}

module.exports = { getByProjectId, getLatest, create };
