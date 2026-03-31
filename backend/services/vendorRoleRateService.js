const { runQuery, getOne, getAll } = require('../config/database');

const NOT_DELETED_ALIAS = '(vrr.vendorrolerate_is_deleted = 0 OR vrr.vendorrolerate_is_deleted IS NULL)';
const NOT_DELETED = '(vendorrolerate_is_deleted = 0 OR vendorrolerate_is_deleted IS NULL)';

async function getByRoleId(db, roleId) {
  return getAll(db,
    `SELECT vrr.*, c.currency_name, s.seniority_description
     FROM vendorrolerates vrr
     LEFT JOIN currencies c ON vrr.currency_id = c.id
     LEFT JOIN seniorities s ON vrr.seniority_id = s.id
     WHERE vrr.vendorcontractrole_id = ? AND ${NOT_DELETED_ALIAS}
     ORDER BY vrr.vendorrolerate_create_date DESC`,
    [roleId]
  );
}

async function getById(db, id) {
  const result = await getOne(db,
    `SELECT vrr.*, c.currency_name, s.seniority_description
     FROM vendorrolerates vrr
     LEFT JOIN currencies c ON vrr.currency_id = c.id
     LEFT JOIN seniorities s ON vrr.seniority_id = s.id
     WHERE vrr.id = ? AND ${NOT_DELETED}`,
    [id]
  );
  return result || null;
}

async function create(db, { vendorrolerate_rate, vendorrolerate_description, vendorcontractrole_id, currency_id, seniority_id }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO vendorrolerates (vendorrolerate_rate, vendorrolerate_description, vendorcontractrole_id, currency_id, seniority_id, vendorrolerate_create_date, vendorrolerate_update_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [vendorrolerate_rate, vendorrolerate_description || null, vendorcontractrole_id, currency_id, seniority_id || null, now, now]
  );
}

async function update(db, id, data) {
  const fields = [];
  const values = [];

  if (data.vendorrolerate_rate !== undefined) { fields.push('vendorrolerate_rate = ?'); values.push(data.vendorrolerate_rate); }
  if (data.vendorrolerate_description !== undefined) { fields.push('vendorrolerate_description = ?'); values.push(data.vendorrolerate_description); }
  if (data.currency_id !== undefined) { fields.push('currency_id = ?'); values.push(data.currency_id); }
  if (data.seniority_id !== undefined) { fields.push('seniority_id = ?'); values.push(data.seniority_id); }

  if (fields.length === 0) return { changes: 0 };

  fields.push('vendorrolerate_update_date = ?');
  values.push(Date.now());
  values.push(id);

  return runQuery(db,
    `UPDATE vendorrolerates SET ${fields.join(', ')} WHERE id = ? AND ${NOT_DELETED}`,
    values
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    `UPDATE vendorrolerates SET vendorrolerate_is_deleted = 1, vendorrolerate_update_date = ? WHERE id = ? AND ${NOT_DELETED}`,
    [Date.now(), id]
  );
}

module.exports = { getByRoleId, getById, create, update, softDelete };
