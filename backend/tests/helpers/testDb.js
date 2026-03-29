const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { runQuery, getOne, getAll } = require('../../config/database');

function createTestDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(':memory:', (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

async function initTestDb() {
  const db = await createTestDb();
  await runQuery(db, 'PRAGMA foreign_keys = ON');

  // Read and apply migration files
  const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const cleaned = sql.split('\n')
      .map(line => line.startsWith('--') ? '' : line)
      .join('\n');
    const statements = cleaned.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await runQuery(db, stmt);
      } catch (err) {
        if (err.message && (err.message.includes('duplicate column name') || err.message.includes('already exists'))) {
          continue;
        }
        throw err;
      }
    }
  }

  return db;
}

async function seedTestDb(db) {
  const now = Date.now();

  // Seed roles
  await runQuery(db, "INSERT INTO userroles (userrole_name, userrole_description, userrole_create_date) VALUES ('superadmin', 'Full access', ?)", [now]);
  await runQuery(db, "INSERT INTO userroles (userrole_name, userrole_description, userrole_create_date) VALUES ('admin', 'Admin access', ?)", [now]);
  await runQuery(db, "INSERT INTO userroles (userrole_name, userrole_description, userrole_create_date) VALUES ('reader', 'Read-only', ?)", [now]);
  await runQuery(db, "INSERT INTO userroles (userrole_name, userrole_description, userrole_create_date) VALUES ('guest', 'Guest access', ?)", [now]);

  // Seed users
  const hash = await bcrypt.hash('testpassword', 10);
  await runQuery(db,
    "INSERT INTO users (user_email, user_name, user_lastname, user_password_hash, user_create_date, userrole_id) VALUES (?, ?, ?, ?, ?, ?)",
    ['superadmin@test.com', 'Super', 'Admin', hash, now, 1]
  );
  await runQuery(db,
    "INSERT INTO users (user_email, user_name, user_lastname, user_password_hash, user_create_date, userrole_id) VALUES (?, ?, ?, ?, ?, ?)",
    ['admin@test.com', 'Test', 'Admin', hash, now, 2]
  );
  await runQuery(db,
    "INSERT INTO users (user_email, user_name, user_lastname, user_password_hash, user_create_date, userrole_id) VALUES (?, ?, ?, ?, ?, ?)",
    ['reader@test.com', 'Test', 'Reader', hash, now, 3]
  );
  await runQuery(db,
    "INSERT INTO users (user_email, user_name, user_lastname, user_password_hash, user_create_date, userrole_id) VALUES (?, ?, ?, ?, ?, ?)",
    ['guest@test.com', 'Test', 'Guest', hash, now, 4]
  );

  // Seed a division
  await runQuery(db,
    "INSERT INTO divisions (division_name, division_create_date) VALUES (?, ?)",
    ['Engineering', now]
  );

  // Seed a delivery path
  await runQuery(db,
    "INSERT INTO deliverypaths (deliverypath_name, deilverypath_description, deliverypath_create_date, deliverypath_update_date) VALUES (?, ?, ?, ?)",
    ['Agile', 'Agile delivery', now, now]
  );

  // Seed an initiative
  await runQuery(db,
    "INSERT INTO initiatives (initiative_name, initiative_description, initiative_create_date) VALUES (?, ?, ?)",
    ['Digital Transformation', 'DX initiative', now]
  );

  return db;
}

function closeTestDb(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = { createTestDb, initTestDb, seedTestDb, closeTestDb };
