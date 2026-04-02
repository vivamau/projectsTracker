const { runQuery, getOne, getAll } = require('../config/database');

async function getById(db, id) {
  return getOne(db,
    `SELECT b.*, c.currency_name
     FROM budgets b
     LEFT JOIN currencies c ON b.currency_id = c.id
     WHERE b.id = ? AND (b.budget_is_deleted = 0 OR b.budget_is_deleted IS NULL)`,
    [id]
  );
}

async function getByProjectId(db, projectId) {
  return getAll(db,
    `SELECT b.*, c.currency_name
     FROM budgets b
     INNER JOIN projects_to_budgets pb ON b.id = pb.budget_id
     LEFT JOIN currencies c ON b.currency_id = c.id
     WHERE pb.project_id = ? AND (b.budget_is_deleted = 0 OR b.budget_is_deleted IS NULL)
     ORDER BY b.budget_create_date DESC`,
    [projectId]
  );
}

async function getTotalByProjectId(db, projectId) {
  const result = await getOne(db,
    `SELECT COALESCE(SUM(b.budget_amount), 0) as total
     FROM budgets b
     INNER JOIN projects_to_budgets pb ON b.id = pb.budget_id
     WHERE pb.project_id = ? AND (b.budget_is_deleted = 0 OR b.budget_is_deleted IS NULL)`,
    [projectId]
  );
  return result.total;
}

async function create(db, { budget_amount, currency_id, budget_approve_date, budget_start_date, budget_end_date }) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO budgets (budget_amount, currency_id, budget_approve_date, budget_start_date, budget_end_date, budget_create_date, budget_update_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [budget_amount, currency_id || null, budget_approve_date || null, budget_start_date || null, budget_end_date || null, now, now]
  );
}

async function update(db, id, { budget_amount, currency_id, budget_approve_date, budget_start_date, budget_end_date }) {
  const fields = [];
  const values = [];

  if (budget_amount !== undefined) { fields.push('budget_amount = ?'); values.push(budget_amount); }
  if (currency_id !== undefined) { fields.push('currency_id = ?'); values.push(currency_id); }
  if (budget_approve_date !== undefined) { fields.push('budget_approve_date = ?'); values.push(budget_approve_date); }
  if (budget_start_date !== undefined) { fields.push('budget_start_date = ?'); values.push(budget_start_date); }
  if (budget_end_date !== undefined) { fields.push('budget_end_date = ?'); values.push(budget_end_date); }

  if (fields.length === 0) return { changes: 0 };

  fields.push('budget_update_date = ?');
  values.push(Date.now());
  values.push(id);

  return runQuery(db,
    `UPDATE budgets SET ${fields.join(', ')} WHERE id = ? AND (budget_is_deleted = 0 OR budget_is_deleted IS NULL)`,
    values
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    'UPDATE budgets SET budget_is_deleted = 1, budget_update_date = ? WHERE id = ? AND (budget_is_deleted = 0 OR budget_is_deleted IS NULL)',
    [Date.now(), id]
  );
}

async function linkToProject(db, projectId, budgetId) {
  return runQuery(db,
    'INSERT INTO projects_to_budgets (project_id, budget_id) VALUES (?, ?)',
    [projectId, budgetId]
  );
}

async function unlinkFromProject(db, projectId, budgetId) {
  return runQuery(db,
    'DELETE FROM projects_to_budgets WHERE project_id = ? AND budget_id = ?',
    [projectId, budgetId]
  );
}

async function getRecent(db, limit = 5) {
  return getAll(db,
    `SELECT b.*, c.currency_name, p.project_name
     FROM budgets b
     LEFT JOIN currencies c ON b.currency_id = c.id
     INNER JOIN projects_to_budgets pb ON b.id = pb.budget_id
     INNER JOIN projects p ON pb.project_id = p.id
     WHERE (b.budget_is_deleted = 0 OR b.budget_is_deleted IS NULL)
     ORDER BY b.budget_create_date DESC
     LIMIT ?`,
    [limit]
  );
}

async function getAllBudgets(db) {
  return getAll(db,
    `SELECT b.*, c.currency_name, p.project_name
     FROM budgets b
     LEFT JOIN currencies c ON b.currency_id = c.id
     INNER JOIN projects_to_budgets pb ON b.id = pb.budget_id
     INNER JOIN projects p ON pb.project_id = p.id
     WHERE (b.budget_is_deleted = 0 OR b.budget_is_deleted IS NULL)
     ORDER BY b.budget_create_date DESC`
  );
}

async function getProjectsByBudgetId(db, budgetId) {
  return getAll(db,
    `SELECT p.id, p.project_name
     FROM projects p
     INNER JOIN projects_to_budgets pb ON p.id = pb.project_id
     WHERE pb.budget_id = ?`,
    [budgetId]
  );
}

module.exports = { getById, getByProjectId, getTotalByProjectId, create, update, softDelete, linkToProject, unlinkFromProject, getRecent, getAllBudgets, getProjectsByBudgetId };
