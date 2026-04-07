const bcrypt = require('bcryptjs');
const { runQuery, getOne, getAll } = require('../config/database');

const SALT_ROUNDS = 10;

async function getAllUsers(db, { page = 1, limit = 20, search } = {}) {
  const offset = (page - 1) * limit;
  let where = 'WHERE (u.user_is_deleted = 0 OR u.user_is_deleted IS NULL)';
  const params = [];

  if (search) {
    where += ' AND (u.user_name LIKE ? OR u.user_lastname LIKE ? OR u.user_email LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern);
  }

  const countRow = await getOne(db,
    `SELECT COUNT(*) as total FROM users u ${where}`,
    params
  );

  params.push(limit, offset);
  const users = await getAll(db,
    `SELECT u.id, u.user_email, u.user_name, u.user_lastname, u.user_middlename,
            u.user_create_date, u.user_update_date, u.user_lastlogin_date,
            u.userrole_id, ur.userrole_name as role
     FROM users u
     LEFT JOIN userroles ur ON u.userrole_id = ur.id
     ${where}
     ORDER BY u.id
     LIMIT ? OFFSET ?`,
    params
  );

  return {
    data: users,
    total: countRow.total,
    page,
    limit,
    totalPages: Math.ceil(countRow.total / limit)
  };
}

async function getById(db, id) {
  return getOne(db,
    `SELECT u.id, u.user_email, u.user_name, u.user_lastname, u.user_middlename,
            u.user_create_date, u.user_update_date, u.user_lastlogin_date,
            u.userrole_id, ur.userrole_name as role
     FROM users u
     LEFT JOIN userroles ur ON u.userrole_id = ur.id
     WHERE u.id = ? AND (u.user_is_deleted = 0 OR u.user_is_deleted IS NULL)`,
    [id]
  );
}

async function create(db, { user_email, user_name, user_lastname, user_middlename, password, userrole_id }) {
  const now = Date.now();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return runQuery(db,
    `INSERT INTO users (user_email, user_name, user_lastname, user_middlename, user_password_hash, user_create_date, userrole_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user_email, user_name, user_lastname, user_middlename || null, hash, now, userrole_id]
  );
}

async function update(db, id, data) {
  const now = Date.now();
  const fields = [];
  const params = [];

  if (data.user_name !== undefined) {
    fields.push('user_name = ?');
    params.push(data.user_name);
  }
  if (data.user_lastname !== undefined) {
    fields.push('user_lastname = ?');
    params.push(data.user_lastname);
  }
  if (data.user_middlename !== undefined) {
    fields.push('user_middlename = ?');
    params.push(data.user_middlename);
  }
  if (data.user_email !== undefined) {
    fields.push('user_email = ?');
    params.push(data.user_email);
  }
  if (data.userrole_id !== undefined) {
    fields.push('userrole_id = ?');
    params.push(data.userrole_id);
  }
  if (data.password !== undefined) {
    const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
    fields.push('user_password_hash = ?');
    params.push(hash);
  }

  if (fields.length === 0) return { changes: 0 };

  fields.push('user_update_date = ?');
  params.push(now);
  params.push(id);

  return runQuery(db,
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    'UPDATE users SET user_is_deleted = 1 WHERE id = ?',
    [id]
  );
}

async function getProjectsByUserId(db, userId) {
  return getAll(db,
    `SELECT p.id, p.project_name, p.project_description, p.project_start_date, p.project_end_date,
            d.division_name, ps.project_status_name, 'Owner' AS user_role,
            p.project_create_date AS role_since_date,
            NULL AS role_end_date,
            NULL AS role_percentage
     FROM projects p
     LEFT JOIN divisions d ON p.division_id = d.id
     LEFT JOIN project_statuses ps ON ps.id = p.project_status_id
     WHERE p.user_id = ? AND (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)

     UNION ALL

     SELECT p.id, p.project_name, p.project_description, p.project_start_date, p.project_end_date,
            d.division_name, ps.project_status_name, 'Project Manager' AS user_role,
            ppm.project_to_projectmanager_start_date AS role_since_date,
            ppm.project_to_projectmanager_end_date AS role_end_date,
            ppm.project_to_projectmanager_percentage AS role_percentage
     FROM projects p
     INNER JOIN projects_to_projectmanagers ppm ON p.id = ppm.project_id
     INNER JOIN projectmanagers pm ON ppm.projectmanager_id = pm.id
     LEFT JOIN divisions d ON p.division_id = d.id
     LEFT JOIN project_statuses ps ON ps.id = p.project_status_id
     WHERE pm.user_id = ? AND (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)

     UNION ALL

     SELECT p.id, p.project_name, p.project_description, p.project_start_date, p.project_end_date,
            d.division_name, ps.project_status_name, 'Solution Architect' AS user_role,
            psa.project_to_solutionarchitect_start_date AS role_since_date,
            psa.project_to_solutionarchitect_end_date AS role_end_date,
            psa.project_to_solutionarchitect_percentage AS role_percentage
     FROM projects p
     INNER JOIN projects_to_solutionarchitects psa ON p.id = psa.project_id
     INNER JOIN solutionarchitects sa ON psa.solutionarchitect_id = sa.id
     LEFT JOIN divisions d ON p.division_id = d.id
     LEFT JOIN project_statuses ps ON ps.id = p.project_status_id
     WHERE sa.user_id = ? AND (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)

     ORDER BY project_name`,
    [userId, userId, userId]
  );
}

module.exports = { getAll: getAllUsers, getById, create, update, softDelete, getProjectsByUserId };
