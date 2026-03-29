const { runQuery, getOne, getAll } = require('../config/database');

async function getAllDeliveryPaths(db) {
  return getAll(db,
    'SELECT * FROM deliverypaths WHERE deliverypath_is_deleted = 0 OR deliverypath_is_deleted IS NULL'
  );
}

async function getById(db, id) {
  return getOne(db,
    'SELECT * FROM deliverypaths WHERE id = ? AND (deliverypath_is_deleted = 0 OR deliverypath_is_deleted IS NULL)',
    [id]
  );
}

async function create(db, { deliverypath_name, deilverypath_description }) {
  const now = Date.now();
  return runQuery(db,
    'INSERT INTO deliverypaths (deliverypath_name, deilverypath_description, deliverypath_create_date, deliverypath_update_date) VALUES (?, ?, ?, ?)',
    [deliverypath_name, deilverypath_description || null, now, now]
  );
}

async function update(db, id, data) {
  const now = Date.now();
  const fields = [];
  const params = [];

  if (data.deliverypath_name !== undefined) {
    fields.push('deliverypath_name = ?');
    params.push(data.deliverypath_name);
  }
  if (data.deilverypath_description !== undefined) {
    fields.push('deilverypath_description = ?');
    params.push(data.deilverypath_description);
  }

  if (fields.length === 0) return { changes: 0 };

  fields.push('deliverypath_update_date = ?');
  params.push(now);
  params.push(id);

  return runQuery(db,
    `UPDATE deliverypaths SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    'UPDATE deliverypaths SET deliverypath_is_deleted = 1 WHERE id = ?',
    [id]
  );
}

module.exports = { getAll: getAllDeliveryPaths, getById, create, update, softDelete };
