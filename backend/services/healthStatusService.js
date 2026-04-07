const { runQuery, getOne, getAll } = require('../config/database');

const JOIN_TYPES = `
  LEFT JOIN healthstatus_types ht ON hs.healthstatus_value = ht.id AND ht.healthstatus_is_deleted = 0
`;

async function getByProjectId(db, projectId) {
  return getAll(db,
    `SELECT hs.*, ht.healthstatus_name
     FROM healthstatuses hs ${JOIN_TYPES}
     WHERE hs.project_id = ?
     ORDER BY hs.healthstatus_create_date DESC, hs.id DESC`,
    [projectId]
  );
}

async function getLatest(db, projectId) {
  return getOne(db,
    `SELECT hs.*, ht.healthstatus_name
     FROM healthstatuses hs ${JOIN_TYPES}
     WHERE hs.project_id = ?
     ORDER BY hs.healthstatus_create_date DESC, hs.id DESC LIMIT 1`,
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
