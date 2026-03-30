const { runQuery, getOne, getAll } = require('../config/database');

async function getByDivisionId(db, divisionId) {
  return getAll(db,
    `SELECT fp.*, u.user_name, u.user_lastname, u.user_email
     FROM focalpoints fp
     LEFT JOIN users u ON fp.user_id = u.id
     WHERE fp.division_id = ?
     ORDER BY u.user_name`,
    [divisionId]
  );
}

async function getById(db, id) {
  const result = await getOne(db,
    `SELECT fp.*, u.user_name, u.user_lastname, u.user_email
     FROM focalpoints fp
     LEFT JOIN users u ON fp.user_id = u.id
     WHERE fp.id = ?`,
    [id]
  );
  return result || null;
}

async function create(db, { division_id, user_id }) {
  return runQuery(db,
    'INSERT INTO focalpoints (division_id, user_id) VALUES (?, ?)',
    [division_id, user_id]
  );
}

async function remove(db, id) {
  return runQuery(db,
    'DELETE FROM focalpoints WHERE id = ?',
    [id]
  );
}

async function syncFocalPoints(db, divisionId, userIds) {
  await runQuery(db,
    'DELETE FROM focalpoints WHERE division_id = ?',
    [divisionId]
  );

  for (const userId of userIds) {
    await create(db, { division_id: divisionId, user_id: userId });
  }
}

module.exports = { getByDivisionId, getById, create, remove, syncFocalPoints };
