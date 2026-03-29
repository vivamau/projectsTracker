const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db = null;

function getDb(dbPath) {
  if (db) return db;

  const resolvedPath = dbPath || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'database.sqlite');

  db = new sqlite3.Database(resolvedPath);
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

function createDb(dbPath) {
  const instance = new sqlite3.Database(dbPath);
  instance.run('PRAGMA foreign_keys = ON');
  return instance;
}

function runQuery(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getOne(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function getAll(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function closeDb() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else {
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = { getDb, createDb, runQuery, getOne, getAll, closeDb };
