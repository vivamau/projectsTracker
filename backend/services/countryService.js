const { getOne, getAll } = require('../config/database');

async function getAllCountries(db, search) {
  if (search) {
    const pattern = `%${search}%`;
    return getAll(db,
      `SELECT * FROM countries
       WHERE short_name LIKE ? OR official_name LIKE ? OR ISO2 LIKE ? OR ISO3 LIKE ?
       ORDER BY short_name`,
      [pattern, pattern, pattern, pattern]
    );
  }
  return getAll(db, 'SELECT * FROM countries ORDER BY short_name');
}

async function getByCode(db, un_country_code) {
  return getOne(db,
    'SELECT * FROM countries WHERE UN_country_code = ?',
    [un_country_code]
  );
}

async function getProjectsByCountry(db, un_country_code) {
  return getAll(db,
    `SELECT p.id, p.project_name, p.project_description, p.project_start_date,
            p.project_end_date, p.project_create_date,
            d.division_name,
            u.user_name as owner_name, u.user_lastname as owner_lastname,
            ps.project_status_name,
            (SELECT hs.healthstatus_value FROM healthstatuses hs
             WHERE hs.project_id = p.id
             ORDER BY hs.healthstatus_create_date DESC, hs.id DESC LIMIT 1) as health_status,
            (SELECT hst.healthstatus_name FROM healthstatuses hs
             LEFT JOIN healthstatus_types hst ON hst.id = hs.healthstatus_value AND hst.healthstatus_is_deleted = 0
             WHERE hs.project_id = p.id
             ORDER BY hs.healthstatus_create_date DESC, hs.id DESC LIMIT 1) as health_status_name
     FROM projects p
     INNER JOIN projects_to_countries ptc ON ptc.project_id = p.id
     LEFT JOIN divisions d ON p.division_id = d.id
     LEFT JOIN users u ON p.user_id = u.id
     LEFT JOIN project_statuses ps ON ps.id = p.project_status_id
     WHERE ptc.UN_country_code = ?
     ORDER BY p.project_create_date DESC`,
    [un_country_code]
  );
}

async function getCountriesWithProjects(db) {
  return getAll(db,
    `SELECT c.*, COUNT(ptc.project_id) as project_count
     FROM countries c
     INNER JOIN projects_to_countries ptc ON ptc.UN_country_code = c.UN_country_code
     GROUP BY c.UN_country_code
     ORDER BY c.short_name`,
    []
  );
}

module.exports = { getAll: getAllCountries, getByCode, getProjectsByCountry, getCountriesWithProjects };
