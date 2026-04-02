const { runQuery, getOne, getAll } = require('../config/database');

const NOT_DELETED_ALIAS = '(c.consumption_is_deleted = 0 OR c.consumption_is_deleted IS NULL)';
const NOT_DELETED = '(consumption_is_deleted = 0 OR consumption_is_deleted IS NULL)';

async function getByItemId(db, itemId) {
  return getAll(db,
    `SELECT c.*, u.user_name, u.user_lastname
     FROM poitem_consumptions c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.purchaseorderitem_id = ? AND ${NOT_DELETED_ALIAS}
     ORDER BY c.consumption_month DESC`,
    [itemId]
  );
}

async function getByItemIdWithSummary(db, itemId) {
  const entries = await getByItemId(db, itemId);

  const totalDaysUsed = entries.reduce((sum, e) => sum + e.consumption_days, 0);

  const item = await getOne(db,
    'SELECT purchaseorderitems_days FROM purchaseorderitems WHERE id = ?',
    [itemId]
  );

  const allocatedDays = item ? item.purchaseorderitems_days : null;
  const utilizationPct = allocatedDays ? Math.round((totalDaysUsed / allocatedDays) * 100) : null;

  return {
    entries,
    total_days_used: totalDaysUsed,
    allocated_days: allocatedDays,
    utilization_pct: utilizationPct
  };
}

async function getById(db, id) {
  const result = await getOne(db,
    `SELECT c.*, u.user_name, u.user_lastname
     FROM poitem_consumptions c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.id = ? AND ${NOT_DELETED_ALIAS}`,
    [id]
  );
  return result || null;
}

async function create(db, { purchaseorderitem_id, consumption_month, consumption_days, consumption_comment, user_id }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO poitem_consumptions (purchaseorderitem_id, consumption_month, consumption_days,
     consumption_comment, user_id, consumption_create_date, consumption_update_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [purchaseorderitem_id, consumption_month, consumption_days, consumption_comment || null, user_id || null, now, now]
  );
}

async function update(db, id, data) {
  const fields = [];
  const values = [];

  if (data.consumption_days !== undefined) { fields.push('consumption_days = ?'); values.push(data.consumption_days); }
  if (data.consumption_comment !== undefined) { fields.push('consumption_comment = ?'); values.push(data.consumption_comment); }

  if (fields.length === 0) return { changes: 0 };

  fields.push('consumption_update_date = ?');
  values.push(Date.now());
  values.push(id);

  return runQuery(db,
    `UPDATE poitem_consumptions SET ${fields.join(', ')} WHERE id = ? AND ${NOT_DELETED}`,
    values
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    `UPDATE poitem_consumptions SET consumption_is_deleted = 1, consumption_update_date = ? WHERE id = ? AND ${NOT_DELETED}`,
    [Date.now(), id]
  );
}

module.exports = { getByItemId, getByItemIdWithSummary, getById, create, update, softDelete };
