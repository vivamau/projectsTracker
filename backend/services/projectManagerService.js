const { runQuery, getOne, getAll } = require('../config/database');

async function getAll_(db) {
  return getAll(db,
    `SELECT pm.*, u.user_name, u.user_lastname, u.user_email
     FROM projectmanagers pm
     LEFT JOIN users u ON pm.user_id = u.id
     ORDER BY u.user_name`
  );
}

async function getById(db, id) {
  const result = await getOne(db,
    `SELECT pm.*, u.user_name, u.user_lastname, u.user_email
     FROM projectmanagers pm
     LEFT JOIN users u ON pm.user_id = u.id
     WHERE pm.id = ?`,
    [id]
  );
  return result || null;
}

async function getByProjectId(db, projectId) {
  return getAll(db,
    `SELECT pm.*, u.user_name, u.user_lastname, u.user_email,
            ppm.division_id, d.division_name
     FROM projectmanagers pm
     INNER JOIN projects_to_projectmanagers ppm ON pm.id = ppm.projectmanager_id
     LEFT JOIN users u ON pm.user_id = u.id
     LEFT JOIN divisions d ON ppm.division_id = d.id
     WHERE ppm.project_id = ?
     ORDER BY u.user_name`,
    [projectId]
  );
}

async function create(db, { user_id }) {
  return runQuery(db,
    'INSERT INTO projectmanagers (user_id) VALUES (?)',
    [user_id]
  );
}

async function linkToProject(db, projectId, projectManagerId, divisionId) {
  const now = Date.now();
  return runQuery(db,
    `INSERT INTO projects_to_projectmanagers (project_id, projectmanager_id, division_id, project_to_projectmanager_create_date, project_to_projectmanager_start_date)
     VALUES (?, ?, ?, ?, ?)`,
    [projectId, projectManagerId, divisionId || null, now, now]
  );
}

async function unlinkFromProject(db, projectId, projectManagerId) {
  return runQuery(db,
    'DELETE FROM projects_to_projectmanagers WHERE project_id = ? AND projectmanager_id = ?',
    [projectId, projectManagerId]
  );
}

async function syncProjectManagers(db, projectId, assignments) {
  // Remove all current PM links for this project
  await runQuery(db,
    'DELETE FROM projects_to_projectmanagers WHERE project_id = ?',
    [projectId]
  );

  for (const assignment of assignments) {
    const { user_id, division_id } = assignment;

    // Find or create a projectmanager record for this user
    let pm = await getOne(db,
      'SELECT id FROM projectmanagers WHERE user_id = ?',
      [user_id]
    );

    if (!pm) {
      const result = await create(db, { user_id });
      pm = { id: result.lastID };
    }

    await linkToProject(db, projectId, pm.id, division_id);
  }
}

module.exports = { getAll: getAll_, getById, getByProjectId, create, linkToProject, unlinkFromProject, syncProjectManagers };
