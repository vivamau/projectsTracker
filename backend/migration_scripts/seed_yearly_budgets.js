/**
 * seed_yearly_budgets.js
 *
 * Creates one budget record per year per project, from the project's start year
 * to min(project end year, 2026). Each budget covers Jan 1 – Dec 31 of that year.
 *
 * Run: node backend/scripts/seed_yearly_budgets.js
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '../data/database.sqlite');
const MAX_YEAR = 2026;

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
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

function firstDayOfYearMs(year) {
  return new Date(`${year}-01-01T00:00:00.000Z`).getTime();
}

function lastDayOfYearMs(year) {
  return new Date(`${year}-12-31T23:59:59.999Z`).getTime();
}

async function main() {
  const db = new sqlite3.Database(DB_PATH);
  const now = Date.now();

  try {
    // Disable FK checks during bulk insert
    await run(db, 'PRAGMA foreign_keys = OFF');

    // Clear existing budgets and links
    await run(db, 'DELETE FROM projects_to_budgets');
    await run(db, 'DELETE FROM budgets');
    await run(db, "DELETE FROM sqlite_sequence WHERE name IN ('budgets', 'projects_to_budgets')");

    console.log('Cleared existing budgets and links.');

    // Fetch all projects with their year ranges
    const projects = await all(db, `
      SELECT
        id,
        project_name,
        CAST(strftime('%Y', project_start_date / 1000, 'unixepoch') AS INTEGER) AS start_year,
        MIN(
          CAST(strftime('%Y', project_end_date / 1000, 'unixepoch') AS INTEGER),
          ${MAX_YEAR}
        ) AS end_year
      FROM projects
      WHERE project_start_date IS NOT NULL AND project_is_deleted = 0
    `);

    let budgetCount = 0;
    let linkCount = 0;

    for (const project of projects) {
      const { id: projectId, project_name, start_year, end_year } = project;

      if (!start_year || start_year > MAX_YEAR) continue;

      for (let year = start_year; year <= end_year; year++) {
        // Insert budget
        const result = await run(db,
          `INSERT INTO budgets
             (budget_amount, budget_start_date, budget_end_date,
              budget_create_date, budget_update_date, currency_id, budget_is_deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [0, firstDayOfYearMs(year), lastDayOfYearMs(year), now, now, 2, 0]
        );

        const budgetId = result.lastID;

        // Link to project
        await run(db,
          `INSERT INTO projects_to_budgets (project_id, budget_id) VALUES (?, ?)`,
          [projectId, budgetId]
        );

        budgetCount++;
        linkCount++;
      }
    }

    await run(db, 'PRAGMA foreign_keys = ON');

    console.log(`\nDone.`);
    console.log(`  Projects processed : ${projects.length}`);
    console.log(`  Budgets created    : ${budgetCount}`);
    console.log(`  Project links      : ${linkCount}`);

    // Sample output
    const sample = await all(db, `
      SELECT b.id, p.project_name,
             strftime('%Y', b.budget_start_date / 1000, 'unixepoch') AS year,
             b.budget_amount
      FROM budgets b
      JOIN projects_to_budgets pb ON pb.budget_id = b.id
      JOIN projects p ON p.id = pb.project_id
      ORDER BY p.id, b.budget_start_date
      LIMIT 10
    `);

    console.log('\nSample (first 10 rows):');
    sample.forEach(r => console.log(`  [${r.id}] ${r.project_name} — Budget ${r.year}`));

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
