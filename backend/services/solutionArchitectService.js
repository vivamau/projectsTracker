const { runQuery, getOne, getAll } = require('../config/database');

async function getByProjectId(db, projectId) {
  return getAll(db,
    `SELECT sa.*, u.user_name, u.user_lastname, u.user_email,
            psa.division_id, d.division_name
     FROM solutionarchitects sa
     INNER JOIN projects_to_solutionarchitects psa ON sa.id = psa.solutionarchitect_id
     LEFT JOIN users u ON sa.user_id = u.id
     LEFT JOIN divisions d ON psa.division_id = d.id
     WHERE psa.project_id = ?
     ORDER BY u.user_name`,
    [projectId]
  );
}

async function create(db, { user_id }) {
  return runQuery(db,
    'INSERT INTO solutionarchitects (user_id) VALUES (?)',
    [user_id]
  );
}

async function syncSolutionArchitects(db, projectId, assignments) {
  await runQuery(db,
    'DELETE FROM projects_to_solutionarchitects WHERE project_id = ?',
    [projectId]
  );

  for (const assignment of assignments) {
    const { user_id, division_id } = assignment;

    let sa = await getOne(db,
      'SELECT id FROM solutionarchitects WHERE user_id = ?',
      [user_id]
    );

    if (!sa) {
      const result = await create(db, { user_id });
      sa = { id: result.lastID };
    }

    const now = Date.now();
    await runQuery(db,
      `INSERT INTO projects_to_solutionarchitects
       (project_id, solutionarchitect_id, division_id, project_to_solutionarchitect_create_date, project_to_solutionarchitect_start_date)
       VALUES (?, ?, ?, ?, ?)`,
      [projectId, sa.id, division_id || null, now, now]
    );
  }
}

module.exports = { getByProjectId, create, syncSolutionArchitects };
