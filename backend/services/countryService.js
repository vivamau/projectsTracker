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

module.exports = { getAll: getAllCountries, getByCode };
