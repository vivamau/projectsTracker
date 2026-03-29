const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOne } = require('../config/database');

async function login(db, email, password) {
  const user = await getOne(db,
    `SELECT u.*, ur.userrole_name as role
     FROM users u
     JOIN userroles ur ON u.userrole_id = ur.id
     WHERE u.user_email = ? AND (u.user_is_deleted = 0 OR u.user_is_deleted IS NULL)`,
    [email]
  );

  if (!user) return null;

  const valid = await bcrypt.compare(password, user.user_password_hash);
  if (!valid) return null;

  const token = jwt.sign(
    { id: user.id, email: user.user_email, role: user.role },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );

  const { user_password_hash, ...safeUser } = user;
  return { user: safeUser, token };
}

async function getUserById(db, id) {
  const user = await getOne(db,
    `SELECT u.id, u.user_email, u.user_name, u.user_lastname, u.user_middlename,
            u.user_create_date, u.user_update_date, u.user_lastlogin_date,
            u.userrole_id, ur.userrole_name as role
     FROM users u
     JOIN userroles ur ON u.userrole_id = ur.id
     WHERE u.id = ? AND (u.user_is_deleted = 0 OR u.user_is_deleted IS NULL)`,
    [id]
  );

  return user || null;
}

module.exports = { login, getUserById };
