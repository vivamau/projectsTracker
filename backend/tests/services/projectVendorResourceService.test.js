const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { runQuery } = require('../../config/database');
const vendorResourceService = require('../../services/vendorResourceService');

let db;
let projectId;
let vendorId;
let resourceId;
const now = Date.now();

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  const vendorResult = await runQuery(db,
    "INSERT INTO vendors (vendor_name, vendor_create_date) VALUES (?, ?)",
    ['Test Vendor', now]
  );
  vendorId = vendorResult.lastID;

  const resourceResult = await runQuery(db,
    "INSERT INTO vendorresources (vendorresource_name, vendorresource_lastname, vendor_id, vendorresource_create_date) VALUES (?, ?, ?, ?)",
    ['John', 'Doe', vendorId, now]
  );
  resourceId = resourceResult.lastID;

  const projectResult = await runQuery(db,
    "INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)",
    ['Test Project', now]
  );
  projectId = projectResult.lastID;
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('vendorResourceService - project assignments', () => {
  describe('getProjectAssignments', () => {
    it('should return empty array when project has no assignments', async () => {
      const result = await vendorResourceService.getProjectAssignments(db, projectId);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return assignments after adding one', async () => {
      await runQuery(db,
        `INSERT INTO projects_to_vendorresources (project_id, vendorresource_id, pvr_percentage, pvr_active, pvr_create_date)
         VALUES (?, ?, ?, ?, ?)`,
        [projectId, resourceId, 100, 'Yes', now]
      );

      const result = await vendorResourceService.getProjectAssignments(db, projectId);
      expect(result.length).toBe(1);
      expect(result[0].vendorresource_id).toBe(resourceId);
      expect(result[0].pvr_percentage).toBe(100);
      expect(result[0].pvr_active).toBe('Yes');
    });

    it('should not return soft-deleted assignments', async () => {
      const r2 = await runQuery(db,
        "INSERT INTO vendorresources (vendorresource_name, vendorresource_lastname, vendor_id, vendorresource_create_date) VALUES (?, ?, ?, ?)",
        ['Jane', 'Smith', vendorId, now]
      );
      await runQuery(db,
        `INSERT INTO projects_to_vendorresources (project_id, vendorresource_id, pvr_percentage, pvr_active, pvr_create_date, pvr_is_deleted)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [projectId, r2.lastID, 50, 'No', now]
      );

      const result = await vendorResourceService.getProjectAssignments(db, projectId);
      const ids = result.map(r => r.vendorresource_id);
      expect(ids).not.toContain(r2.lastID);
    });

    it('should include vendor_name in results', async () => {
      const result = await vendorResourceService.getProjectAssignments(db, projectId);
      expect(result[0]).toHaveProperty('vendor_name');
      expect(result[0].vendor_name).toBe('Test Vendor');
    });
  });

  describe('syncProjectAssignments', () => {
    it('should add new assignments', async () => {
      const p2 = await runQuery(db,
        "INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)",
        ['Project B', now]
      );
      const assignments = [{ vendorresource_id: resourceId, pvr_percentage: 50, pvr_active: 'Yes' }];
      await vendorResourceService.syncProjectAssignments(db, p2.lastID, assignments);

      const result = await vendorResourceService.getProjectAssignments(db, p2.lastID);
      expect(result.length).toBe(1);
      expect(result[0].pvr_percentage).toBe(50);
    });

    it('should remove assignments not in the new list', async () => {
      const p3 = await runQuery(db,
        "INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)",
        ['Project C', now]
      );
      const r3 = await runQuery(db,
        "INSERT INTO vendorresources (vendorresource_name, vendorresource_lastname, vendor_id, vendorresource_create_date) VALUES (?, ?, ?, ?)",
        ['Bob', 'Jones', vendorId, now]
      );
      await runQuery(db,
        `INSERT INTO projects_to_vendorresources (project_id, vendorresource_id, pvr_percentage, pvr_active, pvr_create_date)
         VALUES (?, ?, ?, ?, ?)`,
        [p3.lastID, r3.lastID, 100, 'Yes', now]
      );

      await vendorResourceService.syncProjectAssignments(db, p3.lastID, []);

      const result = await vendorResourceService.getProjectAssignments(db, p3.lastID);
      expect(result.length).toBe(0);
    });

    it('should update percentage when resource already assigned', async () => {
      const p4 = await runQuery(db,
        "INSERT INTO projects (project_name, project_create_date) VALUES (?, ?)",
        ['Project D', now]
      );
      await runQuery(db,
        `INSERT INTO projects_to_vendorresources (project_id, vendorresource_id, pvr_percentage, pvr_active, pvr_create_date)
         VALUES (?, ?, ?, ?, ?)`,
        [p4.lastID, resourceId, 100, 'Yes', now]
      );

      await vendorResourceService.syncProjectAssignments(db, p4.lastID, [
        { vendorresource_id: resourceId, pvr_percentage: 75, pvr_active: 'Yes' }
      ]);

      const result = await vendorResourceService.getProjectAssignments(db, p4.lastID);
      expect(result.length).toBe(1);
      expect(result[0].pvr_percentage).toBe(75);
    });
  });
});
