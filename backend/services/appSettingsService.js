const { runQuery, getOne, getAll: getAllRows } = require('../config/database');

async function get(db, key) {
  const row = await getOne(db,
    'SELECT setting_value FROM app_settings WHERE setting_key = ?',
    [key]
  );
  return row ? row.setting_value : null;
}

async function getWithMeta(db, key) {
  const row = await getOne(db,
    'SELECT * FROM app_settings WHERE setting_key = ?',
    [key]
  );
  return row || null;
}

async function set(db, key, value, updatedBy) {
  const now = Date.now();
  await runQuery(db,
    `INSERT INTO app_settings (setting_key, setting_value, updated_at, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    [key, value, now, updatedBy || null]
  );
}

async function getAll(db) {
  return getAllRows(db, 'SELECT * FROM app_settings ORDER BY setting_key');
}

module.exports = { get, getWithMeta, set, getAll };
