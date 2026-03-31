const { runQuery, getOne, getAll } = require('../config/database');

const NOT_DELETED_ALIAS = '(vc.vendorcontract_is_deleted = 0 OR vc.vendorcontract_is_deleted IS NULL)';
const NOT_DELETED = '(vendorcontract_is_deleted = 0 OR vendorcontract_is_deleted IS NULL)';

async function getByVendorId(db, vendorId) {
  return getAll(db,
    `SELECT vc.* FROM vendorcontracts vc
     WHERE vc.vendor_id = ? AND ${NOT_DELETED_ALIAS}
     ORDER BY vc.contract_start_date DESC`,
    [vendorId]
  );
}

async function getById(db, id) {
  const result = await getOne(db,
    `SELECT * FROM vendorcontracts WHERE id = ? AND ${NOT_DELETED}`,
    [id]
  );
  return result || null;
}

async function create(db, { contract_name, contract_document_path, contract_start_date, contract_end_date, vendor_id }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO vendorcontracts (contract_name, contract_document_path, contract_start_date, contract_end_date, vendor_id, contract_create_date, contract_update_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [contract_name, contract_document_path || null, contract_start_date, contract_end_date || null, vendor_id, now, now]
  );
}

async function update(db, id, data) {
  const fields = [];
  const values = [];

  if (data.contract_name !== undefined) { fields.push('contract_name = ?'); values.push(data.contract_name); }
  if (data.contract_document_path !== undefined) { fields.push('contract_document_path = ?'); values.push(data.contract_document_path); }
  if (data.contract_start_date !== undefined) { fields.push('contract_start_date = ?'); values.push(data.contract_start_date); }
  if (data.contract_end_date !== undefined) { fields.push('contract_end_date = ?'); values.push(data.contract_end_date); }

  if (fields.length === 0) return { changes: 0 };

  fields.push('contract_update_date = ?');
  values.push(Date.now());
  values.push(id);

  return runQuery(db,
    `UPDATE vendorcontracts SET ${fields.join(', ')} WHERE id = ? AND ${NOT_DELETED}`,
    values
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    `UPDATE vendorcontracts SET vendorcontract_is_deleted = 1, contract_update_date = ? WHERE id = ? AND ${NOT_DELETED}`,
    [Date.now(), id]
  );
}

module.exports = { getByVendorId, getById, create, update, softDelete };
