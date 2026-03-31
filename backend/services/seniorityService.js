const { runQuery, getOne, getAll: getAllFromDb } = require('../config/database');

const NOT_DELETED = '(seniority_is_deleted = 0 OR seniority_is_deleted IS NULL)';

async function getAll(db) {
  return getAllFromDb(db,
    `SELECT * FROM seniorities WHERE ${NOT_DELETED}
     ORDER BY seniority_create_date DESC`
  );
}

async function getById(db, id) {
  const result = await getOne(db,
    `SELECT * FROM seniorities WHERE id = ? AND ${NOT_DELETED}`,
    [id]
  );
  return result || null;
}

async function create(db, { seniority_description }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO seniorities (seniority_description, seniority_create_date, seniority_update_date)
     VALUES (?, ?, ?)`,
    [seniority_description, now, now]
  );
}

async function update(db, id, data) {
  const fields = [];
  const values = [];

  if (data.seniority_description !== undefined) { fields.push('seniority_description = ?'); values.push(data.seniority_description); }

  if (fields.length === 0) return { changes: 0 };

  fields.push('seniority_update_date = ?');
  values.push(Date.now());
  values.push(id);

  return runQuery(db,
    `UPDATE seniorities SET ${fields.join(', ')} WHERE id = ? AND ${NOT_DELETED}`,
    values
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    `UPDATE seniorities SET seniority_is_deleted = 1, seniority_update_date = ? WHERE id = ? AND ${NOT_DELETED}`,
    [Date.now(), id]
  );
}

module.exports = { getAll, getById, create, update, softDelete };
