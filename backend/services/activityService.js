const { getAll } = require('../config/database');

async function getByProjectId(db, projectId) {
  return getAll(db,
    `SELECT id, project_id, activity_from, activity_to,
            activity_planned_tickets, activity_closed_tickets,
            activity_bug_tickets, activity_bug_closed_tickets,
            activity_create_date, activity_update_date
     FROM activities
     WHERE project_id = ?
       AND (activity_is_deleted = 0 OR activity_is_deleted IS NULL)
     ORDER BY activity_from ASC`,
    [projectId]
  );
}

module.exports = { getByProjectId };
