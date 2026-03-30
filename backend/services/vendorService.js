const { runQuery, getOne, getAll } = require('../config/database');

const NOT_DELETED = '(vendor_is_deleted = 0 OR vendor_is_deleted IS NULL)';

async function getAllVendors(db) {
  return getAll(db,
    `SELECT * FROM vendors WHERE ${NOT_DELETED} ORDER BY vendor_name`
  );
}

async function getById(db, id) {
  const result = await getOne(db,
    `SELECT * FROM vendors WHERE id = ? AND ${NOT_DELETED}`,
    [id]
  );
  return result || null;
}

async function create(db, { vendor_name, vendor_address, vendor_phone, vendor_email, vendor_website, user_id }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO vendors (vendor_name, vendor_address, vendor_phone, vendor_email, vendor_website, vendor_create_date, vendor_update_date, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [vendor_name, vendor_address || null, vendor_phone || null, vendor_email || null, vendor_website || null, now, now, user_id || null]
  );
}

async function update(db, id, data) {
  const fields = [];
  const values = [];

  if (data.vendor_name !== undefined) { fields.push('vendor_name = ?'); values.push(data.vendor_name); }
  if (data.vendor_address !== undefined) { fields.push('vendor_address = ?'); values.push(data.vendor_address); }
  if (data.vendor_phone !== undefined) { fields.push('vendor_phone = ?'); values.push(data.vendor_phone); }
  if (data.vendor_email !== undefined) { fields.push('vendor_email = ?'); values.push(data.vendor_email); }
  if (data.vendor_website !== undefined) { fields.push('vendor_website = ?'); values.push(data.vendor_website); }

  if (fields.length === 0) return { changes: 0 };

  fields.push('vendor_update_date = ?');
  values.push(Date.now());
  values.push(id);

  return runQuery(db,
    `UPDATE vendors SET ${fields.join(', ')} WHERE id = ? AND ${NOT_DELETED}`,
    values
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    `UPDATE vendors SET vendor_is_deleted = 1, vendor_update_date = ? WHERE id = ? AND ${NOT_DELETED}`,
    [Date.now(), id]
  );
}

module.exports = { getAll: getAllVendors, getById, create, update, softDelete };
