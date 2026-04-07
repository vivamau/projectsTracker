const { runQuery, getOne, getAll } = require('../config/database');
const projectManagerService = require('./projectManagerService');
const solutionArchitectService = require('./solutionArchitectService');
const { getRates, convertToUSD, getLastFetchedAt } = require('../utilities/exchangeRateService');

async function getAllProjects(db, { page = 1, limit = 20, search, division_id, status_id } = {}) {
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

  if (status_id) {
    where += ' AND p.project_status_id = ?';
    params.push(status_id);
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
            ps.id as project_status_id, ps.project_status_name,
            (SELECT hs.healthstatus_value FROM healthstatuses hs
             WHERE hs.project_id = p.id
             ORDER BY hs.healthstatus_create_date DESC, hs.id DESC LIMIT 1) as health_status,
            (SELECT hst.healthstatus_name FROM healthstatuses hs
             LEFT JOIN healthstatus_types hst ON hst.id = hs.healthstatus_value AND hst.healthstatus_is_deleted = 0
             WHERE hs.project_id = p.id
             ORDER BY hs.healthstatus_create_date DESC, hs.id DESC LIMIT 1) as health_status_name
     FROM projects p
     LEFT JOIN divisions d ON p.division_id = d.id
     LEFT JOIN users u ON p.user_id = u.id
     LEFT JOIN project_statuses ps ON ps.id = p.project_status_id
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
            i.initiative_name, dp.deliverypath_name,
            ps.project_status_name
     FROM projects p
     LEFT JOIN divisions d ON p.division_id = d.id
     LEFT JOIN users u ON p.user_id = u.id
     LEFT JOIN initiatives i ON p.initiative_id = i.id
     LEFT JOIN deliverypaths dp ON p.deliverypath_id = dp.id
     LEFT JOIN project_statuses ps ON ps.id = p.project_status_id
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

  // Get supporting divisions
  const supportingDivisions = await getAll(db,
    `SELECT d.* FROM divisions d
     JOIN projects_to_divisions ptd ON d.id = ptd.division_id
     WHERE ptd.project_id = ? AND (d.division_is_deleted = 0 OR d.division_is_deleted IS NULL)`,
    [id]
  );

  // Get latest health status
  const healthStatus = await getOne(db,
    `SELECT hs.*, hst.healthstatus_name
     FROM healthstatuses hs
     LEFT JOIN healthstatus_types hst ON hst.id = hs.healthstatus_value AND hst.healthstatus_is_deleted = 0
     WHERE hs.project_id = ?
     ORDER BY hs.healthstatus_create_date DESC LIMIT 1`,
    [id]
  );

  // Get technology stacks
  const tecStacks = await getAll(db,
    `SELECT ts.id, ts.tec_stack_name, ts.tec_stack_type, ts.tec_stack_support
     FROM tec_stacks ts
     JOIN projects_to_tec_stacks pts ON ts.id = pts.tec_stack_id
     WHERE pts.project_id = ?
       AND (ts.tec_stack_is_deleted = 0 OR ts.tec_stack_is_deleted IS NULL)
     ORDER BY ts.tec_stack_type, ts.tec_stack_name`,
    [id]
  );

  // Get project managers
  const projectManagers = await projectManagerService.getByProjectId(db, id);

  // Get solution architects
  const solutionArchitects = await solutionArchitectService.getByProjectId(db, id);

  return {
    ...project,
    owner_name: project.user_name,
    owner_lastname: project.user_lastname,
    latest_health_status: healthStatus ? healthStatus.healthstatus_value : null,
    latest_health_status_name: healthStatus ? healthStatus.healthstatus_name : null,
    countries,
    supporting_divisions: supportingDivisions,
    tec_stacks: tecStacks,
    project_managers: projectManagers,
    solution_architects: solutionArchitects
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

  // Link supporting divisions if provided
  if (data.supporting_division_ids && data.supporting_division_ids.length > 0) {
    const mainDivId = data.division_id ? parseInt(data.division_id) : null;
    for (const divId of data.supporting_division_ids) {
      if (divId === mainDivId) continue;
      await runQuery(db,
        'INSERT INTO projects_to_divisions (project_id, division_id) VALUES (?, ?)',
        [result.lastID, divId]
      );
    }
  }

  // Sync project managers if provided
  if (data.project_managers) {
    await projectManagerService.syncProjectManagers(db, result.lastID, data.project_managers);
  }

  // Sync solution architects if provided
  if (data.solution_architects) {
    await solutionArchitectService.syncSolutionArchitects(db, result.lastID, data.solution_architects);
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
    if (fields.length === 0 && !data.project_managers && data.supporting_division_ids === undefined) {
      await runQuery(db,
        'UPDATE projects SET project_update_date = ? WHERE id = ?',
        [now, id]
      );
      result = { changes: 1 };
    }
  }

  // Sync supporting divisions if provided
  if (data.supporting_division_ids !== undefined) {
    await runQuery(db,
      'DELETE FROM projects_to_divisions WHERE project_id = ?',
      [id]
    );
    const mainDivId = data.division_id ? parseInt(data.division_id) : null;
    for (const divId of data.supporting_division_ids) {
      if (divId === mainDivId) continue;
      await runQuery(db,
        'INSERT INTO projects_to_divisions (project_id, division_id) VALUES (?, ?)',
        [id, divId]
      );
    }
    // If only supporting divisions changed, mark as updated
    if (fields.length === 0 && !data.country_codes && !data.project_managers) {
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

  // Sync solution architects if provided
  if (data.solution_architects !== undefined) {
    await solutionArchitectService.syncSolutionArchitects(db, id, data.solution_architects);
    if (fields.length === 0 && !data.country_codes && !data.project_managers) {
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

  const groupCounts = await getOne(db,
    `SELECT
       COUNT(CASE WHEN LOWER(ps.project_status_name) = 'queued' THEN 1 END) as queued,
       COUNT(CASE WHEN LOWER(ps.project_status_name) = 'discovery' THEN 1 END) as discovery,
       COUNT(CASE WHEN LOWER(ps.project_status_name) IN ('discontinued','ended','support ended') THEN 1 END) as ended,
       COUNT(CASE WHEN
         ps.project_status_name IS NULL OR
         LOWER(ps.project_status_name) NOT IN ('queued','discovery','discontinued','ended','support ended')
       THEN 1 END) as active
     FROM projects p
     LEFT JOIN project_statuses ps ON ps.id = p.project_status_id AND ps.project_status_is_deleted = 0
     WHERE (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)`
  );

  const totalDivisions = await getOne(db,
    'SELECT COUNT(*) as count FROM divisions WHERE division_is_deleted = 0 OR division_is_deleted IS NULL'
  );

  const activityStats = await getOne(db,
    `SELECT
       COALESCE(SUM(activity_planned_tickets), 0)    as total_tickets,
       COALESCE(SUM(activity_closed_tickets), 0)     as closed_tickets,
       COALESCE(SUM(activity_bug_tickets), 0)        as total_bugs,
       COALESCE(SUM(activity_bug_closed_tickets), 0) as closed_bugs,
       COUNT(DISTINCT project_id)                    as projects_reporting
     FROM activities
     WHERE activity_is_deleted = 0 OR activity_is_deleted IS NULL`
  );

  const vendorCounts = await getOne(db,
    `SELECT
       COUNT(DISTINCT v.id) as vendors,
       COUNT(vr.id) as resources
     FROM vendors v
     LEFT JOIN vendorresources vr ON vr.vendor_id = v.id
     WHERE v.vendor_is_deleted = 0 OR v.vendor_is_deleted IS NULL`
  );

  const poAmountByCurrency = await getAll(db,
    `SELECT COALESCE(SUM(i.purchaseorderitems_days * i.purchaseorderitems_discounted_rate), 0) as subtotal,
            COALESCE(cur.currency_name, 'USD') as currency
     FROM purchaseorderitems i
     LEFT JOIN currencies cur ON cur.id = i.currency_id
     WHERE i.purchaseorderitem_is_deleted = 0 OR i.purchaseorderitem_is_deleted IS NULL
     GROUP BY i.currency_id`
  );

  const poSpentByCurrency = await getAll(db,
    `SELECT COALESCE(SUM(c.consumption_days * i.purchaseorderitems_discounted_rate), 0) as subtotal,
            COALESCE(cur.currency_name, 'USD') as currency
     FROM poitem_consumptions c
     JOIN purchaseorderitems i ON i.id = c.purchaseorderitem_id
     LEFT JOIN currencies cur ON cur.id = i.currency_id
     WHERE (c.consumption_is_deleted = 0 OR c.consumption_is_deleted IS NULL)
       AND (i.purchaseorderitem_is_deleted = 0 OR i.purchaseorderitem_is_deleted IS NULL)
     GROUP BY i.currency_id`
  );

  const exchangeRates = await getRates();
  const totalPOAmount = { total: poAmountByCurrency.reduce((sum, row) => sum + convertToUSD(row.subtotal, row.currency, exchangeRates), 0) };
  const totalPOSpent  = { total: poSpentByCurrency.reduce((sum, row)  => sum + convertToUSD(row.subtotal, row.currency, exchangeRates), 0) };

  const healthDistribution = await getAll(db,
    `SELECT hs.healthstatus_value as id, hst.healthstatus_name as name, COUNT(*) as count
     FROM healthstatuses hs
     INNER JOIN (
       SELECT project_id, MAX(healthstatus_create_date) as max_date
       FROM healthstatuses
       GROUP BY project_id
     ) latest ON hs.project_id = latest.project_id AND hs.healthstatus_create_date = latest.max_date
     INNER JOIN projects p ON hs.project_id = p.id
     LEFT JOIN healthstatus_types hst ON hst.id = hs.healthstatus_value AND hst.healthstatus_is_deleted = 0
     WHERE p.project_is_deleted = 0 OR p.project_is_deleted IS NULL
     GROUP BY hs.healthstatus_value`
  );

  const projectManagers = await getAll(db,
    `SELECT u.id as user_id, u.user_name, u.user_lastname, u.user_email,
            COUNT(DISTINCT ppm.project_id) as project_count
     FROM projectmanagers pm
     JOIN users u ON pm.user_id = u.id
     LEFT JOIN projects_to_projectmanagers ppm ON ppm.projectmanager_id = pm.id
     LEFT JOIN projects p ON p.id = ppm.project_id
       AND (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)
     GROUP BY pm.id
     ORDER BY u.user_name`
  );

  const solutionArchitects = await getAll(db,
    `SELECT u.id as user_id, u.user_name, u.user_lastname, u.user_email,
            COUNT(DISTINCT psa.project_id) as project_count
     FROM solutionarchitects sa
     JOIN users u ON sa.user_id = u.id
     LEFT JOIN projects_to_solutionarchitects psa ON psa.solutionarchitect_id = sa.id
     LEFT JOIN projects p ON p.id = psa.project_id
       AND (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)
     GROUP BY sa.id
     ORDER BY u.user_name`
  );

  const owners = await getAll(db,
    `SELECT u.id as user_id, u.user_name, u.user_lastname, u.user_email,
            COUNT(DISTINCT p.id) as project_count
     FROM users u
     JOIN projects p ON p.user_id = u.id
     WHERE (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)
     GROUP BY u.id
     ORDER BY u.user_name`
  );

  const projectManagersCount = await projectManagerService.getCount(db);
  const solutionArchitectsCount = await solutionArchitectService.getCount(db);

  return {
    totalProjects: totalProjects.count,
    totalPOAmount: totalPOAmount.total || 0,
    totalPOSpent: totalPOSpent.total || 0,
    totalVendors: vendorCounts.vendors || 0,
    totalResources: vendorCounts.resources || 0,
    activityStats: {
      openTickets:       (activityStats.total_tickets - activityStats.closed_tickets) || 0,
      closedTickets:      activityStats.closed_tickets || 0,
      openBugs:          (activityStats.total_bugs    - activityStats.closed_bugs)    || 0,
      closedBugs:         activityStats.closed_bugs   || 0,
      projectsReporting:  activityStats.projects_reporting || 0,
      projectsNotReporting: Math.max(0, (totalProjects.count || 0) - (activityStats.projects_reporting || 0)),
    },
    groupCounts: {
      queued: groupCounts.queued || 0,
      discovery: groupCounts.discovery || 0,
      active: groupCounts.active || 0,
      ended: groupCounts.ended || 0,
    },
    totalDivisions: totalDivisions.count,
    exchangeRates: exchangeRates,
    exchangeRatesUpdatedAt: getLastFetchedAt(),
    healthDistribution: healthDistribution,
    projectManagers: projectManagers,
    solutionArchitects: solutionArchitects,
    owners: owners,
    projectManagersCount,
    solutionArchitectsCount
  };
}

module.exports = { getAll: getAllProjects, getById, create, update, softDelete, getStats };
