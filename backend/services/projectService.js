const { runQuery, getOne, getAll } = require('../config/database');
const projectManagerService = require('./projectManagerService');

async function getAllProjects(db, { page = 1, limit = 20, search, division_id } = {}) {
  const offset = (page - 1) * limit;
  let where = 'WHERE (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)';
  const params = [];

  if (search) {
    where += ' AND (p.project_name LIKE ? OR p.project_description LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }

  if (division_id) {
    where += ' AND p.division_id = ?';
    params.push(division_id);
  }

  const countRow = await getOne(db,
    `SELECT COUNT(*) as total FROM projects p ${where}`,
    params
  );

  params.push(limit, offset);
  const projects = await getAll(db,
    `SELECT p.id, p.project_name, p.project_description, p.project_create_date,
            p.project_update_date, p.project_plan_date, p.project_start_date,
            p.project_end_date, p.division_id, p.user_id, p.initiative_id,
            p.deliverypath_id,
            d.division_name,
            u.user_name as owner_name, u.user_lastname as owner_lastname,
            (SELECT hs.healthstatus_value FROM healthstatuses hs
             WHERE hs.project_id = p.id
             ORDER BY hs.healthstatus_create_date DESC, hs.id DESC LIMIT 1) as health_status
     FROM projects p
     LEFT JOIN divisions d ON p.division_id = d.id
     LEFT JOIN users u ON p.user_id = u.id
     ${where}
     ORDER BY p.project_create_date DESC
     LIMIT ? OFFSET ?`,
    params
  );

  return {
    data: projects,
    total: countRow.total,
    page,
    limit,
    totalPages: Math.ceil(countRow.total / limit)
  };
}

async function getById(db, id) {
  const project = await getOne(db,
    `SELECT p.*, d.division_name, u.user_name, u.user_lastname,
            i.initiative_name, dp.deliverypath_name
     FROM projects p
     LEFT JOIN divisions d ON p.division_id = d.id
     LEFT JOIN users u ON p.user_id = u.id
     LEFT JOIN initiatives i ON p.initiative_id = i.id
     LEFT JOIN deliverypaths dp ON p.deliverypath_id = dp.id
     WHERE p.id = ? AND (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)`,
    [id]
  );

  if (!project) return null;

  // Get linked countries
  const countries = await getAll(db,
    `SELECT c.* FROM countries c
     JOIN projects_to_countries ptc ON c.UN_country_code = ptc.UN_country_code
     WHERE ptc.project_id = ?`,
    [id]
  );

  // Get latest health status
  const healthStatus = await getOne(db,
    `SELECT * FROM healthstatuses
     WHERE project_id = ?
     ORDER BY healthstatus_create_date DESC LIMIT 1`,
    [id]
  );

  // Get project managers
  const projectManagers = await projectManagerService.getByProjectId(db, id);

  return {
    ...project,
    owner_name: project.user_name,
    owner_lastname: project.user_lastname,
    latest_health_status: healthStatus ? healthStatus.healthstatus_value : null,
    countries,
    project_managers: projectManagers
  };
}

async function create(db, data) {
  const now = Date.now();
  const result = await runQuery(db,
    `INSERT INTO projects (project_name, project_description, project_create_date,
     project_plan_date, project_start_date, project_end_date,
     division_id, user_id, initiative_id, deliverypath_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.project_name,
      data.project_description || null,
      now,
      data.project_plan_date || null,
      data.project_start_date || null,
      data.project_end_date || null,
      data.division_id || null,
      data.user_id || null,
      data.initiative_id || null,
      data.deliverypath_id || null
    ]
  );

  // Link countries if provided
  if (data.country_codes && data.country_codes.length > 0) {
    for (const code of data.country_codes) {
      await runQuery(db,
        'INSERT INTO projects_to_countries (project_id, UN_country_code) VALUES (?, ?)',
        [result.lastID, code]
      );
    }
  }

  // Sync project managers if provided
  if (data.project_managers) {
    await projectManagerService.syncProjectManagers(db, result.lastID, data.project_managers);
  }

  return result;
}

async function update(db, id, data) {
  const now = Date.now();
  const fields = [];
  const params = [];

  if (data.project_name !== undefined) {
    fields.push('project_name = ?');
    params.push(data.project_name);
  }
  if (data.project_description !== undefined) {
    fields.push('project_description = ?');
    params.push(data.project_description);
  }
  if (data.project_plan_date !== undefined) {
    fields.push('project_plan_date = ?');
    params.push(data.project_plan_date);
  }
  if (data.project_start_date !== undefined) {
    fields.push('project_start_date = ?');
    params.push(data.project_start_date);
  }
  if (data.project_end_date !== undefined) {
    fields.push('project_end_date = ?');
    params.push(data.project_end_date);
  }
  if (data.division_id !== undefined) {
    fields.push('division_id = ?');
    params.push(data.division_id);
  }
  if (data.user_id !== undefined) {
    fields.push('user_id = ?');
    params.push(data.user_id);
  }
  if (data.initiative_id !== undefined) {
    fields.push('initiative_id = ?');
    params.push(data.initiative_id);
  }
  if (data.deliverypath_id !== undefined) {
    fields.push('deliverypath_id = ?');
    params.push(data.deliverypath_id);
  }

  let result = { changes: 0 };

  if (fields.length > 0) {
    fields.push('project_update_date = ?');
    params.push(now);
    params.push(id);

    result = await runQuery(db,
      `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
  }

  // Sync country links if provided
  if (data.country_codes !== undefined) {
    await runQuery(db,
      'DELETE FROM projects_to_countries WHERE project_id = ?',
      [id]
    );
    for (const code of data.country_codes) {
      await runQuery(db,
        'INSERT INTO projects_to_countries (project_id, UN_country_code) VALUES (?, ?)',
        [id, code]
      );
    }
    // If only countries changed, mark as updated
    if (fields.length === 0 && !data.project_managers) {
      await runQuery(db,
        'UPDATE projects SET project_update_date = ? WHERE id = ?',
        [now, id]
      );
      result = { changes: 1 };
    }
  }

  // Sync project managers if provided
  if (data.project_managers !== undefined) {
    await projectManagerService.syncProjectManagers(db, id, data.project_managers);
    if (fields.length === 0 && !data.country_codes) {
      await runQuery(db,
        'UPDATE projects SET project_update_date = ? WHERE id = ?',
        [now, id]
      );
      result = { changes: 1 };
    }
  }

  return result;
}

async function softDelete(db, id) {
  return runQuery(db,
    'UPDATE projects SET project_is_deleted = 1 WHERE id = ?',
    [id]
  );
}

async function getStats(db) {
  const totalProjects = await getOne(db,
    'SELECT COUNT(*) as count FROM projects WHERE project_is_deleted = 0 OR project_is_deleted IS NULL'
  );

  const activeProjects = await getOne(db,
    `SELECT COUNT(*) as count FROM projects
     WHERE (project_is_deleted = 0 OR project_is_deleted IS NULL)
     AND project_start_date IS NOT NULL AND project_end_date IS NULL`
  );

  const totalDivisions = await getOne(db,
    'SELECT COUNT(*) as count FROM divisions WHERE division_is_deleted = 0 OR division_is_deleted IS NULL'
  );

  const healthDistribution = await getAll(db,
    `SELECT hs.healthstatus_value, COUNT(*) as count
     FROM healthstatuses hs
     INNER JOIN (
       SELECT project_id, MAX(healthstatus_create_date) as max_date
       FROM healthstatuses
       GROUP BY project_id
     ) latest ON hs.project_id = latest.project_id AND hs.healthstatus_create_date = latest.max_date
     INNER JOIN projects p ON hs.project_id = p.id
     WHERE p.project_is_deleted = 0 OR p.project_is_deleted IS NULL
     GROUP BY hs.healthstatus_value`
  );

  const recentProjects = await getAll(db,
    `SELECT p.id, p.project_name, p.project_create_date, d.division_name
     FROM projects p
     LEFT JOIN divisions d ON p.division_id = d.id
     WHERE p.project_is_deleted = 0 OR p.project_is_deleted IS NULL
     ORDER BY p.project_create_date DESC
     LIMIT 5`
  );

  // Convert healthDistribution array to object { "3": 5, "2": 2, "1": 1 }
  const healthMap = {};
  for (const row of healthDistribution) {
    healthMap[row.healthstatus_value] = row.count;
  }

  return {
    totalProjects: totalProjects.count,
    activeProjects: activeProjects.count,
    totalDivisions: totalDivisions.count,
    healthDistribution: healthMap,
    recentProjects
  };
}

module.exports = { getAll: getAllProjects, getById, create, update, softDelete, getStats };
