const { getAll } = require('../config/database');

async function getByProjectId(db, projectId) {
  return getAll(db,
    `SELECT a.id, a.project_code, a.activity_from, a.activity_to,
            a.activity_planned_tickets, a.activity_closed_tickets,
            a.activity_bug_tickets, a.activity_bug_closed_tickets,
            a.activity_create_date, a.activity_update_date
     FROM activities a
     JOIN projects p ON CAST(p.project_code AS TEXT) = CAST(a.project_code AS TEXT)
     WHERE p.id = ?
       AND (a.activity_is_deleted = 0 OR a.activity_is_deleted IS NULL)
     ORDER BY a.activity_from ASC`,
    [projectId]
  );
}

module.exports = { getByProjectId };
