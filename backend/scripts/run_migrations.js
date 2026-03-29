const fs = require('fs');
const path = require('path');
const { runQuery, getOne, getAll } = require('../config/database');

async function runMigrations(db) {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // Ensure _migrations table exists
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);

  for (const file of files) {
    const existing = await getOne(db, 'SELECT id FROM _migrations WHERE name = ?', [file]);
    if (existing) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    // Remove comment-only lines before splitting by semicolons
    const cleaned = sql.split('\n')
      .map(line => line.startsWith('--') ? '' : line)
      .join('\n');
    const statements = cleaned
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await runQuery(db, stmt);
      } catch (err) {
        // Silently ignore "duplicate column" errors from ALTER TABLE
        if (err.message && err.message.includes('duplicate column name')) {
          continue;
        }
        // Ignore "table already exists" errors
        if (err.message && err.message.includes('already exists')) {
          continue;
        }
        throw err;
      }
    }

    await runQuery(db, 'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)', [file, Date.now()]);
    console.log(`  Migration applied: ${file}`);
  }
}

module.exports = { runMigrations };
