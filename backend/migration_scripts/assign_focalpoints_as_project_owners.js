/**
 * Assign focalpoints as owners (user_id) of their registered projects.
 * Matches source focalpoint_email to target users.user_email.
 * Source project IDs are preserved in the target database.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const SOURCE_DB = path.resolve('/Users/vivamau/projects/frankeeno-be/db/projects.db');
const TARGET_DB = path.resolve(__dirname, '../data/database.sqlite');

function open(file) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => { if (err) reject(err); else resolve(); });
  });
}

async function main() {
  const src = await open(SOURCE_DB);
  const tgt = await open(TARGET_DB);

  // Load focalpoint email → project id mapping from source
  const mappings = await all(src,
    `SELECT p.id AS project_id, fp.focalpoint_email AS email
     FROM project p
     JOIN focalpoint fp ON p.focalpoint_id = fp.id
     WHERE fp.focalpoint_email IS NOT NULL
       AND fp.focalpoint_email != ''
       AND fp.focalpoint_email != 'not.defined@wfp.org'`
  );

  // Build email → user_id map from target
  const targetUsers = await all(tgt, 'SELECT id, user_email FROM users');
  const emailToUserId = new Map(
    targetUsers.map(u => [u.user_email.toLowerCase(), u.id])
  );

  // Load existing projects in target
  const targetProjectIds = new Set(
    (await all(tgt, 'SELECT id FROM projects')).map(r => r.id)
  );

  let updated = 0;
  let skipped_no_user = 0;
  let skipped_no_project = 0;

  for (const { project_id, email } of mappings) {
    const normalizedEmail = email.trim().toLowerCase();
    const userId = emailToUserId.get(normalizedEmail);

    if (!userId) {
      console.log(`  SKIP (no user): project ${project_id} — ${normalizedEmail}`);
      skipped_no_user++;
      continue;
    }

    if (!targetProjectIds.has(project_id)) {
      console.log(`  SKIP (no project): id=${project_id}`);
      skipped_no_project++;
      continue;
    }

    await run(tgt,
      'UPDATE projects SET user_id = ? WHERE id = ?',
      [userId, project_id]
    );
    updated++;
    console.log(`  OK: project ${project_id} → user ${userId} (${normalizedEmail})`);
  }

  console.log('\nDone.');
  console.log(`Projects updated      : ${updated}`);
  console.log(`Skipped (no user)     : ${skipped_no_user}`);
  console.log(`Skipped (no project)  : ${skipped_no_project}`);

  await close(src);
  await close(tgt);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
