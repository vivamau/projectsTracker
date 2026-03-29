const { runQuery, getOne, getAll } = require('../config/database');

async function getAllInitiatives(db) {
  return getAll(db,
    'SELECT * FROM initiatives WHERE initiative_is_deleted = 0 OR initiative_is_deleted IS NULL'
  );
}

async function getById(db, id) {
  return getOne(db,
    'SELECT * FROM initiatives WHERE id = ? AND (initiative_is_deleted = 0 OR initiative_is_deleted IS NULL)',
    [id]
  );
}

async function create(db, { initiative_name, initiative_description }) {
  const now = Date.now();
  return runQuery(db,
    'INSERT INTO initiatives (initiative_name, initiative_description, initiative_create_date) VALUES (?, ?, ?)',
    [initiative_name, initiative_description || null, now]
  );
}

async function update(db, id, data) {
  const now = Date.now();
  const fields = [];
  const params = [];

  if (data.initiative_name !== undefined) {
    fields.push('initiative_name = ?');
    params.push(data.initiative_name);
  }
  if (data.initiative_description !== undefined) {
    fields.push('initiative_description = ?');
    params.push(data.initiative_description);
  }

  if (fields.length === 0) return { changes: 0 };

  fields.push('initiative_update_date = ?');
  params.push(now);
  params.push(id);

  return runQuery(db,
    `UPDATE initiatives SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    'UPDATE initiatives SET initiative_is_deleted = 1 WHERE id = ?',
    [id]
  );
}

module.exports = { getAll: getAllInitiatives, getById, create, update, softDelete };
