const bcrypt = require('bcryptjs');
const { getOne, getAll, runQuery } = require('../config/database');

const DEFAULT_USERS = [
  { email: 'superadmin@projecttracker.it', name: 'Super', lastname: 'Admin', password: 'superadminpassword', role: 'superadmin' },
  { email: 'admin@projecttracker.it', name: 'Project', lastname: 'Admin', password: 'adminpassword', role: 'admin' },
  { email: 'contributor@projecttracker.it', name: 'Project', lastname: 'Contributor', password: 'contributorpassword', role: 'contributor' },
  { email: 'guest@projecttracker.it', name: 'Project', lastname: 'Guest', password: 'guestpassword', role: 'guest' }
];

async function seedUsers(db) {
  const rows = await getAll(db, 'SELECT id FROM users');
  if (rows.length > 0) {
    console.log('  Users already seeded, skipping.');
    return;
  }

  const now = Date.now();
  for (const user of DEFAULT_USERS) {
    const role = await getOne(db, 'SELECT id FROM userroles WHERE userrole_name = ?', [user.role]);
    if (!role) {
      console.warn(`  Role "${user.role}" not found, skipping user ${user.email}`);
      continue;
    }

    const hash = await bcrypt.hash(user.password, 10);
    await runQuery(db,
      `INSERT INTO users (user_email, user_name, user_lastname, user_password_hash, user_create_date, userrole_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.email, user.name, user.lastname, hash, now, role.id]
    );
  }
  console.log(`  Seeded ${DEFAULT_USERS.length} default users.`);
}

module.exports = { seedUsers };
