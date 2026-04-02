const { runQuery, getOne, getAll } = require('../config/database');

const NOT_DELETED_ALIAS = '(poi.purchaseorderitem_is_deleted = 0 OR poi.purchaseorderitem_is_deleted IS NULL)';
const NOT_DELETED = '(purchaseorderitem_is_deleted = 0 OR purchaseorderitem_is_deleted IS NULL)';

async function getByPoId(db, poId) {
  return getAll(db,
    `SELECT poi.*, c.currency_name, vcr.vendorcontractrole_name,
     COALESCE(cons.total_days_consumed, 0) as total_days_consumed
     FROM purchaseorderitems poi
     LEFT JOIN currencies c ON poi.currency_id = c.id
     LEFT JOIN vendorcontractroles vcr ON poi.vendorcontractrole_id = vcr.id
     LEFT JOIN (
       SELECT purchaseorderitem_id, SUM(consumption_days) as total_days_consumed
       FROM poitem_consumptions
       WHERE (consumption_is_deleted = 0 OR consumption_is_deleted IS NULL)
       GROUP BY purchaseorderitem_id
     ) cons ON poi.id = cons.purchaseorderitem_id
     WHERE poi.purchaseorder_id = ? AND ${NOT_DELETED_ALIAS}
     ORDER BY poi.purchaseorderitem_start_date DESC`,
    [poId]
  );
}

async function getById(db, id) {
  const result = await getOne(db,
    `SELECT poi.*, c.currency_name, vcr.vendorcontractrole_name
     FROM purchaseorderitems poi
     LEFT JOIN currencies c ON poi.currency_id = c.id
     LEFT JOIN vendorcontractroles vcr ON poi.vendorcontractrole_id = vcr.id
     WHERE poi.id = ? AND ${NOT_DELETED_ALIAS}`,
    [id]
  );
  return result || null;
}

async function create(db, { purchaseorderitem_description, purchaseorderitem_start_date, purchaseorderitem_end_date, purchaseorderitems_days, purchaseorderitems_discounted_rate, purchaseorder_id, currency_id, vendorcontractrole_id, vendorrolerate_id, vendorresource_id }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO purchaseorderitems (purchaseorderitem_description, purchaseorderitem_start_date, purchaseorderitem_end_date,
     purchaseorderitems_days, purchaseorderitems_discounted_rate, purchaseorderitem_create_date, purchaseorderitem_update_date,
     purchaseorder_id, currency_id, vendorcontractrole_id, vendorrolerate_id, vendorresource_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      purchaseorderitem_description || null,
      purchaseorderitem_start_date,
      purchaseorderitem_end_date || null,
      purchaseorderitems_days || null,
      purchaseorderitems_discounted_rate || null,
      now, now,
      purchaseorder_id,
      currency_id || null,
      vendorcontractrole_id || null,
      vendorrolerate_id || null,
      vendorresource_id || null
    ]
  );
}

async function update(db, id, data) {
  const fields = [];
  const values = [];

  if (data.purchaseorderitem_description !== undefined) { fields.push('purchaseorderitem_description = ?'); values.push(data.purchaseorderitem_description); }
  if (data.purchaseorderitem_start_date !== undefined) { fields.push('purchaseorderitem_start_date = ?'); values.push(data.purchaseorderitem_start_date); }
  if (data.purchaseorderitem_end_date !== undefined) { fields.push('purchaseorderitem_end_date = ?'); values.push(data.purchaseorderitem_end_date); }
  if (data.purchaseorderitems_days !== undefined) { fields.push('purchaseorderitems_days = ?'); values.push(data.purchaseorderitems_days); }
  if (data.purchaseorderitems_discounted_rate !== undefined) { fields.push('purchaseorderitems_discounted_rate = ?'); values.push(data.purchaseorderitems_discounted_rate); }
  if (data.currency_id !== undefined) { fields.push('currency_id = ?'); values.push(data.currency_id); }
  if (data.vendorcontractrole_id !== undefined) { fields.push('vendorcontractrole_id = ?'); values.push(data.vendorcontractrole_id); }
  if (data.vendorrolerate_id !== undefined) { fields.push('vendorrolerate_id = ?'); values.push(data.vendorrolerate_id); }
  if (data.vendorresource_id !== undefined) { fields.push('vendorresource_id = ?'); values.push(data.vendorresource_id); }

  if (fields.length === 0) return { changes: 0 };

  fields.push('purchaseorderitem_update_date = ?');
  values.push(Date.now());
  values.push(id);

  return runQuery(db,
    `UPDATE purchaseorderitems SET ${fields.join(', ')} WHERE id = ? AND ${NOT_DELETED}`,
    values
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    `UPDATE purchaseorderitems SET purchaseorderitem_is_deleted = 1, purchaseorderitem_update_date = ? WHERE id = ? AND ${NOT_DELETED}`,
    [Date.now(), id]
  );
}

module.exports = { getByPoId, getById, create, update, softDelete };
