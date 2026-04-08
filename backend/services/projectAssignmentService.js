const { runQuery, getAll } = require('../config/database');

async function getByProjectId(db, projectId) {
  return getAll(db,
    `SELECT pa.*,
            u.user_name, u.user_lastname, u.user_email,
            pr.role_name,
            d.division_name
     FROM project_assignments pa
     JOIN users u ON u.id = pa.user_id
     JOIN project_roles pr ON pr.id = pa.project_role_id
     LEFT JOIN divisions d ON d.id = pa.division_id
     WHERE pa.project_id = ?
     ORDER BY pr.role_name, u.user_name`,
    [projectId]
  );
}

async function syncForProject(db, projectId, assignments) {
  await runQuery(db,
    'DELETE FROM project_assignments WHERE project_id = ?',
    [projectId]
  );
  const now = Date.now();
  for (const a of assignments) {
    await runQuery(db,
      `INSERT INTO project_assignments
         (project_id, user_id, project_role_id, division_id,
          assignment_create_date, assignment_start_date, assignment_end_date,
          assignment_update_date, assignment_percentage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        a.user_id,
        a.project_role_id,
        a.division_id || null,
        now,
        a.start_date || null,
        a.end_date || null,
        now,
        a.percentage != null ? a.percentage : null
      ]
    );
  }
}

async function getCountByRole(db) {
  return getAll(db,
    `SELECT pr.id as role_id, pr.role_name, COUNT(DISTINCT pa.id) as count
     FROM project_roles pr
     LEFT JOIN project_assignments pa ON pa.project_role_id = pr.id
     WHERE pr.role_is_deleted = 0 OR pr.role_is_deleted IS NULL
     GROUP BY pr.id
     ORDER BY pr.role_name`
  );
}

module.exports = { getByProjectId, syncForProject, getCountByRole };
