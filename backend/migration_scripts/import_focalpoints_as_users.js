/**
 * Import focalpoints from frankeeno-be as guest users.
 * Skips any focalpoint whose email already exists in the users table.
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const SOURCE_DB = path.resolve('/Users/vivamau/projects/frankeeno-be/db/projects.db');
const TARGET_DB = path.resolve(__dirname, '../data/database.sqlite');
const GUEST_PASSWORD = 'guestpassword';
const GUEST_ROLE_ID = 4;

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

  const focalpoints = await all(src,
    `SELECT id, focalpoint_name, focalpoint_lastname, focalpoint_email, create_date
     FROM focalpoint
     WHERE focalpoint_email IS NOT NULL AND focalpoint_email != ''`
  );

  const existingEmails = new Set(
    (await all(tgt, 'SELECT user_email FROM users')).map(r => r.user_email.toLowerCase())
  );

  const hash = await bcrypt.hash(GUEST_PASSWORD, 10);
  const now = Date.now();

  let inserted = 0;
  let skipped = 0;

  for (const fp of focalpoints) {
    const email = fp.focalpoint_email.trim().toLowerCase();
    if (existingEmails.has(email)) {
      skipped++;
      continue;
    }
    await run(tgt,
      `INSERT INTO users
         (user_email, user_name, user_lastname, user_password_hash, userrole_id, user_create_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, fp.focalpoint_name || '', fp.focalpoint_lastname || '', hash, GUEST_ROLE_ID, fp.create_date || now]
    );
    existingEmails.add(email);
    inserted++;
  }

  console.log(`Focalpoints processed : ${focalpoints.length}`);
  console.log(`Users inserted        : ${inserted}`);
  console.log(`Skipped (duplicate)   : ${skipped}`);

  await close(src);
  await close(tgt);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
