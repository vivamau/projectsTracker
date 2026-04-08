const { runQuery, getOne, getAll } = require('../config/database');

async function getAll_(db) {
  return getAll(db,
    `SELECT * FROM project_roles
     WHERE role_is_deleted = 0 OR role_is_deleted IS NULL
     ORDER BY role_name`
  );
}

async function getById(db, id) {
  const result = await getOne(db,
    `SELECT * FROM project_roles
     WHERE id = ? AND (role_is_deleted = 0 OR role_is_deleted IS NULL)`,
    [id]
  );
  return result || null;
}

async function create(db, { role_name, role_description }) {
  return runQuery(db,
    `INSERT INTO project_roles (role_name, role_description, role_create_date)
     VALUES (?, ?, ?)`,
    [role_name, role_description || null, Date.now()]
  );
}

async function update(db, id, { role_name, role_description }) {
  const fields = [];
  const params = [];
  if (role_name !== undefined) { fields.push('role_name = ?'); params.push(role_name); }
  if (role_description !== undefined) { fields.push('role_description = ?'); params.push(role_description); }
  if (fields.length === 0) return { changes: 0 };
  params.push(id);
  return runQuery(db,
    `UPDATE project_roles SET ${fields.join(', ')} WHERE id = ? AND (role_is_deleted = 0 OR role_is_deleted IS NULL)`,
    params
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    `UPDATE project_roles SET role_is_deleted = 1 WHERE id = ? AND (role_is_deleted = 0 OR role_is_deleted IS NULL)`,
    [id]
  );
}

module.exports = { getAll: getAll_, getById, create, update, softDelete };
