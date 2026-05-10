const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOne, runQuery } = require('../config/database');

const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hour
const SALT_ROUNDS = 10;

async function deactivateExpired(db, userId) {
  const now = Date.now();
  await runQuery(db,
    `UPDATE users SET user_active = 0, userrole_id = 4, user_password_hash = NULL,
     user_update_date = ? WHERE id = ?`,
    [now, userId]
  );
}

async function login(db, email, password) {
  const user = await getOne(db,
    `SELECT u.*, ur.userrole_name as role
     FROM users u
     JOIN userroles ur ON u.userrole_id = ur.id
     WHERE u.user_email = ? AND (u.user_is_deleted = 0 OR u.user_is_deleted IS NULL)`,
    [email]
  );

  if (!user) return null;
  if (user.user_active === 0) return null;
  if (!user.user_password_hash) return null;
  if (user.user_expire_date && Date.now() > user.user_expire_date) {
    await deactivateExpired(db, user.id);
    return { expired: true };
  }

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
            u.userrole_id, ur.userrole_name as role, u.user_avatar_seed
     FROM users u
     JOIN userroles ur ON u.userrole_id = ur.id
     WHERE u.id = ? AND (u.user_is_deleted = 0 OR u.user_is_deleted IS NULL)`,
    [id]
  );

  return user || null;
}

async function updateAvatarSeed(db, id, seed) {
  await runQuery(db, 'UPDATE users SET user_avatar_seed = ? WHERE id = ?', [seed || null, id]);
}

async function createPasswordResetToken(db, email) {
  const user = await getOne(db,
    `SELECT id FROM users WHERE user_email = ? AND user_active = 1
     AND (user_is_deleted = 0 OR user_is_deleted IS NULL)`,
    [email]
  );
  if (!user) return null; // don't reveal whether email exists

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expires = Date.now() + RESET_TOKEN_EXPIRES_MS;

  await runQuery(db,
    'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
    [hashedToken, expires, user.id]
  );

  return rawToken;
}

async function resetPassword(db, rawToken, newPassword) {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await getOne(db,
    `SELECT id FROM users
     WHERE password_reset_token = ? AND password_reset_expires > ?
     AND (user_is_deleted = 0 OR user_is_deleted IS NULL)`,
    [hashedToken, Date.now()]
  );
  if (!user) return false;

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await runQuery(db,
    `UPDATE users SET user_password_hash = ?, password_reset_token = NULL,
     password_reset_expires = NULL, user_update_date = ? WHERE id = ?`,
    [hash, Date.now(), user.id]
  );
  return true;
}

module.exports = { login, getUserById, updateAvatarSeed, createPasswordResetToken, resetPassword };
