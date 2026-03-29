const { getOne, getAll, runQuery } = require('../config/database');

const DEFAULT_ROLES = [
  { name: 'superadmin', description: 'Full system access' },
  { name: 'admin', description: 'Administrative access' },
  { name: 'reader', description: 'Read-only access' },
  { name: 'guest', description: 'Limited guest access' }
];

async function seedUserRoles(db) {
  const rows = await getAll(db, 'SELECT id FROM userroles');
  if (rows.length > 0) {
    console.log('  UserRoles already seeded, skipping.');
    return;
  }

  const now = Date.now();
  for (const role of DEFAULT_ROLES) {
    await runQuery(db,
      'INSERT INTO userroles (userrole_name, userrole_description, userrole_create_date) VALUES (?, ?, ?)',
      [role.name, role.description, now]
    );
  }
  console.log(`  Seeded ${DEFAULT_ROLES.length} user roles.`);
}

module.exports = { seedUserRoles };
