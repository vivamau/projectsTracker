const { runQuery, getOne, getAll } = require('../config/database');

const NOT_DELETED_ALIAS = '(po.purchaseorder_is_deleted = 0 OR po.purchaseorder_is_deleted IS NULL)';
const NOT_DELETED = '(purchaseorder_is_deleted = 0 OR purchaseorder_is_deleted IS NULL)';

const SORT_COLUMNS = {
  description: 'po.purchaseorder_description',
  project:     'p.project_name',
  vendor:      'v.vendor_name',
  items:       'item_count',
  total_value: 'total_value',
  start_date:  'po.purchaseorder_start_date',
  created:     'po.purchaseorder_create_date',
};

async function getAllPaginated(db, { page = 1, limit = 20, search, sortBy = 'start_date', sortDir = 'desc' } = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  let where = `WHERE ${NOT_DELETED_ALIAS}`;

  if (search) {
    where += ` AND (po.purchaseorder_description LIKE ? OR v.vendor_name LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  const orderCol = SORT_COLUMNS[sortBy] || SORT_COLUMNS.start_date;
  const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';

  const countRow = await getOne(db,
    `SELECT COUNT(*) as total
     FROM purchaseorders po
     LEFT JOIN vendors v ON po.vendor_id = v.id
     ${where}`,
    params
  );

  const rows = await getAll(db,
    `SELECT po.id, po.purchaseorder_description, po.purchaseorder_create_date,
            po.purchaseorder_start_date, po.purchaseorder_end_date,
            po.vendor_id, po.budget_id,
            v.vendor_name,
            u.user_name, u.user_lastname,
            ps.purchaseorderstatus_name,
            p.id as project_id, p.project_name,
            COUNT(poi.id) as item_count,
            COALESCE(SUM(poi.purchaseorderitems_days * poi.purchaseorderitems_discounted_rate), 0) as total_value,
            MAX(c.currency_name) as currency_name
     FROM purchaseorders po
     LEFT JOIN vendors v ON po.vendor_id = v.id
     LEFT JOIN users u ON po.user_id = u.id
     LEFT JOIN purchaseorderstatuses ps ON po.purchaseorderitem_status_id = ps.id
     LEFT JOIN projects_to_budgets pb ON pb.budget_id = po.budget_id
     LEFT JOIN projects p ON p.id = pb.project_id
     LEFT JOIN purchaseorderitems poi ON poi.purchaseorder_id = po.id
       AND (poi.purchaseorderitem_is_deleted = 0 OR poi.purchaseorderitem_is_deleted IS NULL)
     LEFT JOIN currencies c ON poi.currency_id = c.id
     ${where}
     GROUP BY po.id
     ORDER BY ${orderCol} ${orderDir}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    data: rows,
    total: countRow.total,
    page,
    limit,
    totalPages: Math.ceil(countRow.total / limit),
  };
}

async function getByBudgetId(db, budgetId) {
  return getAll(db,
    `SELECT po.*, v.vendor_name, u.user_name, u.user_lastname
     FROM purchaseorders po
     LEFT JOIN vendors v ON po.vendor_id = v.id
     LEFT JOIN users u ON po.user_id = u.id
     WHERE po.budget_id = ? AND ${NOT_DELETED_ALIAS}
     ORDER BY po.purchaseorder_start_date DESC`,
    [budgetId]
  );
}

async function getById(db, id) {
  const result = await getOne(db,
    `SELECT po.*, v.vendor_name, u.user_name, u.user_lastname
     FROM purchaseorders po
     LEFT JOIN vendors v ON po.vendor_id = v.id
     LEFT JOIN users u ON po.user_id = u.id
     WHERE po.id = ? AND ${NOT_DELETED_ALIAS}`,
    [id]
  );
  return result || null;
}

async function create(db, { purchaseorder_description, purchaseorder_start_date, purchaseorder_end_date, budget_id, vendor_id, user_id }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO purchaseorders (purchaseorder_description, purchaseorder_start_date, purchaseorder_end_date,
     purchaseorder_create_date, purchaseorder_update_date, budget_id, vendor_id, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      purchaseorder_description || null,
      purchaseorder_start_date,
      purchaseorder_end_date || null,
      now, now,
      budget_id,
      vendor_id || null,
      user_id || null
    ]
  );
}

async function update(db, id, data) {
  const fields = [];
  const values = [];

  if (data.purchaseorder_description !== undefined) { fields.push('purchaseorder_description = ?'); values.push(data.purchaseorder_description); }
  if (data.purchaseorder_start_date !== undefined) { fields.push('purchaseorder_start_date = ?'); values.push(data.purchaseorder_start_date); }
  if (data.purchaseorder_end_date !== undefined) { fields.push('purchaseorder_end_date = ?'); values.push(data.purchaseorder_end_date); }
  if (data.vendor_id !== undefined) { fields.push('vendor_id = ?'); values.push(data.vendor_id); }
  if (data.user_id !== undefined) { fields.push('user_id = ?'); values.push(data.user_id); }

  if (fields.length === 0) return { changes: 0 };

  fields.push('purchaseorder_update_date = ?');
  values.push(Date.now());
  values.push(id);

  return runQuery(db,
    `UPDATE purchaseorders SET ${fields.join(', ')} WHERE id = ? AND ${NOT_DELETED}`,
    values
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    `UPDATE purchaseorders SET purchaseorder_is_deleted = 1, purchaseorder_update_date = ? WHERE id = ? AND ${NOT_DELETED}`,
    [Date.now(), id]
  );
}

module.exports = { getAllPaginated, getByBudgetId, getById, create, update, softDelete };
