const { runQuery, getOne, getAll } = require('../config/database');

async function getAllDivisions(db) {
  return getAll(db,
    'SELECT * FROM divisions WHERE division_is_deleted = 0 OR division_is_deleted IS NULL'
  );
}

async function getById(db, id) {
  return getOne(db,
    'SELECT * FROM divisions WHERE id = ? AND (division_is_deleted = 0 OR division_is_deleted IS NULL)',
    [id]
  );
}

async function create(db, { division_name }) {
  const now = Date.now();
  return runQuery(db,
    'INSERT INTO divisions (division_name, division_create_date) VALUES (?, ?)',
    [division_name, now]
  );
}

async function update(db, id, { division_name }) {
  const now = Date.now();
  return runQuery(db,
    'UPDATE divisions SET division_name = ?, division_update_date = ? WHERE id = ?',
    [division_name, now, id]
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    'UPDATE divisions SET division_is_deleted = 1 WHERE id = ? AND (division_is_deleted = 0 OR division_is_deleted IS NULL)',
    [id]
  );
}

module.exports = { getAll: getAllDivisions, getById, create, update, softDelete };
