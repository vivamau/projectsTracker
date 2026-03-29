const { runQuery, getOne, getAll } = require('../config/database');

async function getAllCurrencies(db) {
  return getAll(db,
    'SELECT * FROM currencies WHERE currency_is_deleted = 0 OR currency_is_deleted IS NULL ORDER BY currency_name'
  );
}

async function getById(db, id) {
  const result = await getOne(db,
    'SELECT * FROM currencies WHERE id = ? AND (currency_is_deleted = 0 OR currency_is_deleted IS NULL)',
    [id]
  );
  return result || null;
}

async function create(db, { currency_name }) {
  return runQuery(db,
    'INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)',
    [currency_name, Date.now()]
  );
}

async function softDelete(db, id) {
  return runQuery(db,
    'UPDATE currencies SET currency_is_deleted = 1 WHERE id = ? AND (currency_is_deleted = 0 OR currency_is_deleted IS NULL)',
    [id]
  );
}

module.exports = { getAll: getAllCurrencies, getById, create, softDelete };
