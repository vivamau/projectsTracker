const fs = require('fs');
const path = require('path');
const { runQuery, getOne, getAll } = require('../config/database');

const notesDir = () => process.env.NOTES_DIR || path.join(__dirname, '..', 'data', 'notes');

function noteFilePath(db, noteId) {
  return path.join(notesDir(), `${noteId}.md`);
}

async function getAll_(db, { type, search, date, entity_type, entity_id } = {}) {
  let where = 'WHERE (n.note_is_deleted = 0 OR n.note_is_deleted IS NULL)';
  const params = [];
  if (type) { where += ' AND n.note_type = ?'; params.push(type); }
  if (search) { where += ' AND n.note_title LIKE ?'; params.push(`%${search}%`); }
  if (date) {
    const start = new Date(date).getTime();
    where += ' AND n.note_date >= ? AND n.note_date < ?';
    params.push(start, start + 86400000);
  }
  if (entity_type && entity_id !== undefined && entity_id !== '') {
    where += ' AND EXISTS (SELECT 1 FROM meeting_note_entities mne2 WHERE mne2.note_id = n.id AND mne2.entity_type = ? AND mne2.entity_id = ?)';
    params.push(entity_type, String(entity_id));
  }
  return getAll(db,
    `SELECT n.*,
            u.user_name, u.user_lastname,
            COUNT(e.id) as entity_count
     FROM meeting_notes n
     LEFT JOIN users u ON u.id = n.created_by_user_id
     LEFT JOIN meeting_note_entities e ON e.note_id = n.id
     ${where}
     GROUP BY n.id
     ORDER BY n.note_date DESC, n.note_createdate DESC`,
    params
  );
}

async function getById(db, id) {
  const note = await getOne(db,
    `SELECT n.*, u.user_name, u.user_lastname
     FROM meeting_notes n
     LEFT JOIN users u ON u.id = n.created_by_user_id
     WHERE n.id = ? AND (n.note_is_deleted = 0 OR n.note_is_deleted IS NULL)`,
    [id]
  );
  if (!note) return null;
  const entities = await getAll(db,
    `SELECT mne.entity_type, mne.entity_id,
       CASE mne.entity_type
         WHEN 'project'    THEN (SELECT project_name   FROM projects    WHERE id = CAST(mne.entity_id AS INTEGER))
         WHEN 'division'   THEN (SELECT division_name  FROM divisions   WHERE id = CAST(mne.entity_id AS INTEGER))
         WHEN 'initiative' THEN (SELECT initiative_name FROM initiatives WHERE id = CAST(mne.entity_id AS INTEGER))
         WHEN 'vendor'     THEN (SELECT vendor_name    FROM vendors     WHERE id = CAST(mne.entity_id AS INTEGER))
         WHEN 'user'       THEN (SELECT TRIM(user_name || ' ' || COALESCE(user_lastname, '')) FROM users WHERE id = CAST(mne.entity_id AS INTEGER))
         WHEN 'country'    THEN (SELECT short_name     FROM countries   WHERE UN_country_code = mne.entity_id)
       END AS entity_label
     FROM meeting_note_entities mne
     WHERE mne.note_id = ?
     ORDER BY mne.entity_type, mne.entity_id`,
    [id]
  );
  return { ...note, entities };
}

async function getContent(db, noteId) {
  const filePath = noteFilePath(db, noteId);
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

async function create(db, data, content = '') {
  const now = Date.now();
  const result = await runQuery(db,
    `INSERT INTO meeting_notes (note_title, note_type, note_date, note_createdate, created_by_user_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.note_title,
      data.note_type || 'meeting',
      data.note_date || null,
      now,
      data.created_by_user_id || null
    ]
  );
  fs.mkdirSync(notesDir(), { recursive: true });
  fs.writeFileSync(noteFilePath(db, result.lastID), content, 'utf8');
  return result;
}

async function update(db, id, data, content) {
  const fields = ['note_updatedate = ?'];
  const params = [Date.now()];

  if (data.note_title !== undefined) { fields.push('note_title = ?'); params.push(data.note_title); }
  if (data.note_type !== undefined) { fields.push('note_type = ?'); params.push(data.note_type); }
  if (data.note_date !== undefined) { fields.push('note_date = ?'); params.push(data.note_date); }

  params.push(id);
  const result = await runQuery(db,
    `UPDATE meeting_notes SET ${fields.join(', ')}
     WHERE id = ? AND (note_is_deleted = 0 OR note_is_deleted IS NULL)`,
    params
  );

  if (content !== null && content !== undefined) {
    fs.mkdirSync(notesDir(), { recursive: true });
    fs.writeFileSync(noteFilePath(db, id), content, 'utf8');
  }

  return result;
}

async function softDelete(db, id) {
  return runQuery(db,
    `UPDATE meeting_notes SET note_is_deleted = 1
     WHERE id = ? AND (note_is_deleted = 0 OR note_is_deleted IS NULL)`,
    [id]
  );
}

async function syncEntities(db, noteId, entities = []) {
  await runQuery(db, 'DELETE FROM meeting_note_entities WHERE note_id = ?', [noteId]);
  const now = Date.now();
  for (const e of entities) {
    await runQuery(db,
      'INSERT INTO meeting_note_entities (note_id, entity_type, entity_id, link_createdate) VALUES (?, ?, ?, ?)',
      [noteId, e.entity_type, String(e.entity_id), now]
    );
  }
}

module.exports = { getAll: getAll_, getById, getContent, create, update, softDelete, syncEntities };
