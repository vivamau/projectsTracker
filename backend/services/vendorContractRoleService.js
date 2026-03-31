const { runQuery, getOne, getAll } = require('../config/database');

const NOT_DELETED_ALIAS = '(vcr.vendorcontractrole_is_deleted = 0 OR vcr.vendorcontractrole_is_deleted IS NULL)';
const NOT_DELETED = '(vendorcontractrole_is_deleted = 0 OR vendorcontractrole_is_deleted IS NULL)';

async function getByContractId(db, contractId) {
  return getAll(db,
    `SELECT vcr.* FROM vendorcontractroles vcr
     WHERE vcr.vendorcontract_id = ? AND ${NOT_DELETED_ALIAS}
     ORDER BY vcr.vendorcontractrole_create_date DESC`,
    [contractId]
  );
}

async function getById(db, id) {
  const result = await getOne(db,
    `SELECT * FROM vendorcontractroles WHERE id = ? AND ${NOT_DELETED}`,
    [id]
  );
  return result || null;
}

async function create(db, { vendorcontractrole_name, vendorcontractrole_description, vendorcontract_id }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO vendorcontractroles (vendorcontractrole_name, vendorcontractrole_description, vendorcontract_id, vendorcontractrole_create_date, vendorcontractrole_update_date)
     VALUES (?, ?, ?, ?, ?)`,
    [vendorcontractrole_name, vendorcontractrole_description || null, vendorcontract_id, now, now]
  );
}

async function update(db, id, data) {
  const fields = [];
  const values = [];

  if (data.vendorcontractrole_name !== undefined) { fields.push('vendorcontractrole_name = ?'); values.push(data.vendorcontractrole_name); }
  if (data.vendorcontractrole_description !== undefined) { fields.push('vendorcontractrole_description = ?'); values.push(data.vendorcontractrole_description); }

  if (fields.length === 0) return { changes: 0 };

  fields.push('vendorcontractrole_update_date = ?');
  values.push(Date.now());
  values.push(id);

  return runQuery(db,
    `UPDATE vendorcontractroles SET ${fields.join(', ')} WHERE id = ? AND ${NOT_DELETED}`,
    values
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    `UPDATE vendorcontractroles SET vendorcontractrole_is_deleted = 1, vendorcontractrole_update_date = ? WHERE id = ? AND ${NOT_DELETED}`,
    [Date.now(), id]
  );
}

module.exports = { getByContractId, getById, create, update, softDelete };
