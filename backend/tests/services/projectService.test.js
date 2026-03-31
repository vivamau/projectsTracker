const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { runQuery } = require('../../config/database');
const projectService = require('../../services/projectService');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  // Seed countries for project-country linking tests
  await runQuery(db,
    "INSERT INTO countries (ISO2, ISO3, short_name, official_name, UN_country_code, UNDP_country_code) VALUES (?, ?, ?, ?, ?, ?)",
    ['IT', 'ITA', 'Italy', 'Italian Republic', 380, 'ITA']
  );
  await runQuery(db,
    "INSERT INTO countries (ISO2, ISO3, short_name, official_name, UN_country_code, UNDP_country_code) VALUES (?, ?, ?, ?, ?, ?)",
    ['US', 'USA', 'United States', 'United States of America', 840, 'USA']
  );

  // Seed additional divisions for supporting divisions tests
  await runQuery(db, "INSERT INTO divisions (division_name, division_create_date) VALUES (?, ?)", ['Finance', Date.now()]);
  await runQuery(db, "INSERT INTO divisions (division_name, division_create_date) VALUES (?, ?)", ['Operations', Date.now()]);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('projectService', () => {
  describe('create', () => {
    it('should create a project with required fields', async () => {
      const result = await projectService.create(db, {
        project_name: 'Test Project 1',
        division_id: 1,
        user_id: 1,
        initiative_id: 1,
        deliverypath_id: 1
      });
      expect(result.lastID).toBeGreaterThan(0);
    });

    it('should create a project with all optional fields', async () => {
      const now = Date.now();
      const result = await projectService.create(db, {
        project_name: 'Full Project',
        project_description: 'A complete project',
        project_plan_date: now,
        project_start_date: now,
        division_id: 1,
        user_id: 1,
        initiative_id: 1,
        deliverypath_id: 1
      });
      expect(result.lastID).toBeGreaterThan(0);
    });

    it('should create a project with country links', async () => {
      const result = await projectService.create(db, {
        project_name: 'International Project',
        division_id: 1,
        user_id: 1,
        initiative_id: 1,
        deliverypath_id: 1,
        country_codes: [380, 840]
      });
      expect(result.lastID).toBeGreaterThan(0);
      const project = await projectService.getById(db, result.lastID);
      expect(project.countries.length).toBe(2);
    });

    it('should create a project with only name', async () => {
      const result = await projectService.create(db, {
        project_name: 'Minimal Project'
      });
      expect(result.lastID).toBeGreaterThan(0);
    });
  });

  describe('getAll', () => {
    it('should return paginated projects with joined names', async () => {
      const result = await projectService.getAll(db);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.page).toBe(1);
      expect(result.data[0].division_name).toBeDefined();
    });

    it('should paginate results', async () => {
      const result = await projectService.getAll(db, { page: 1, limit: 2 });
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should filter by search term', async () => {
      const result = await projectService.getAll(db, { search: 'International' });
      expect(result.data.length).toBe(1);
      expect(result.data[0].project_name).toBe('International Project');
    });

    it('should filter by division_id', async () => {
      const result = await projectService.getAll(db, { division_id: 1 });
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach(p => {
        expect(p.division_id).toBe(1);
      });
    });

    it('should not return deleted projects', async () => {
      const created = await projectService.create(db, {
        project_name: 'DeletedProject',
        division_id: 1,
        user_id: 1
      });
      await projectService.softDelete(db, created.lastID);
      const result = await projectService.getAll(db, { search: 'DeletedProject' });
      expect(result.data.length).toBe(0);
    });
  });

  describe('getById', () => {
    it('should return a project with countries and health status', async () => {
      // Use the international project created above
      const all = await projectService.getAll(db, { search: 'International' });
      const project = await projectService.getById(db, all.data[0].id);
      expect(project).not.toBeNull();
      expect(project.project_name).toBe('International Project');
      expect(project.countries).toBeDefined();
      expect(project.countries.length).toBe(2);
      expect(project.division_name).toBe('Engineering');
      expect(project.initiative_name).toBe('Digital Transformation');
      expect(project.deliverypath_name).toBe('Agile');
    });

    it('should include latest health status', async () => {
      const created = await projectService.create(db, {
        project_name: 'Health Project',
        division_id: 1,
        user_id: 1
      });
      const now = Date.now();
      await runQuery(db,
        'INSERT INTO healthstatuses (healthstatus_value, healthstatus_comment, healthstatus_create_date, project_id) VALUES (?, ?, ?, ?)',
        [3, 'All good', now, created.lastID]
      );
      const project = await projectService.getById(db, created.lastID);
      expect(project.latest_health_status).toBe(3);
    });

    it('should return null for non-existent id', async () => {
      const project = await projectService.getById(db, 9999);
      expect(project).toBeNull();
    });

    it('should return null for deleted project', async () => {
      const created = await projectService.create(db, {
        project_name: 'DeletedGetById',
        division_id: 1,
        user_id: 1
      });
      await projectService.softDelete(db, created.lastID);
      const project = await projectService.getById(db, created.lastID);
      expect(project).toBeNull();
    });
  });

  describe('update', () => {
    it('should update project name', async () => {
      const created = await projectService.create(db, {
        project_name: 'OldProjectName',
        division_id: 1,
        user_id: 1
      });
      const result = await projectService.update(db, created.lastID, {
        project_name: 'NewProjectName'
      });
      expect(result.changes).toBe(1);
      const project = await projectService.getById(db, created.lastID);
      expect(project.project_name).toBe('NewProjectName');
    });

    it('should sync country links', async () => {
      const created = await projectService.create(db, {
        project_name: 'CountrySync',
        division_id: 1,
        user_id: 1,
        country_codes: [380]
      });
      // Change from Italy to USA
      await projectService.update(db, created.lastID, {
        country_codes: [840]
      });
      const project = await projectService.getById(db, created.lastID);
      expect(project.countries.length).toBe(1);
      expect(project.countries[0].UN_country_code).toBe(840);
    });

    it('should clear country links with empty array', async () => {
      const created = await projectService.create(db, {
        project_name: 'ClearCountries',
        division_id: 1,
        user_id: 1,
        country_codes: [380, 840]
      });
      await projectService.update(db, created.lastID, {
        country_codes: []
      });
      const project = await projectService.getById(db, created.lastID);
      expect(project.countries.length).toBe(0);
    });

    it('should return 0 changes with empty data', async () => {
      const result = await projectService.update(db, 1, {});
      expect(result.changes).toBe(0);
    });

    it('should update project description', async () => {
      const created = await projectService.create(db, {
        project_name: 'DescProject',
        division_id: 1,
        user_id: 1,
        project_description: 'Old description'
      });
      const result = await projectService.update(db, created.lastID, {
        project_description: 'New description'
      });
      expect(result.changes).toBe(1);
      const project = await projectService.getById(db, created.lastID);
      expect(project.project_description).toBe('New description');
    });

    it('should update project dates', async () => {
      const created = await projectService.create(db, {
        project_name: 'DatesProject',
        division_id: 1,
        user_id: 1
      });
      const now = Date.now();
      const result = await projectService.update(db, created.lastID, {
        project_plan_date: now,
        project_start_date: now + 1000,
        project_end_date: now + 2000
      });
      expect(result.changes).toBe(1);
      const project = await projectService.getById(db, created.lastID);
      expect(project.project_plan_date).toBe(now);
      expect(project.project_start_date).toBe(now + 1000);
      expect(project.project_end_date).toBe(now + 2000);
    });

    it('should update division_id', async () => {
      const created = await projectService.create(db, {
        project_name: 'DivisionProject',
        division_id: 1,
        user_id: 1
      });
      const result = await projectService.update(db, created.lastID, {
        division_id: 1
      });
      expect(result.changes).toBe(1);
    });

    it('should update user_id (owner)', async () => {
      const created = await projectService.create(db, {
        project_name: 'OwnerProject',
        division_id: 1,
        user_id: 1
      });
      const result = await projectService.update(db, created.lastID, {
        user_id: 1
      });
      expect(result.changes).toBe(1);
    });

    it('should update initiative_id', async () => {
      const created = await projectService.create(db, {
        project_name: 'InitiativeProject',
        division_id: 1,
        user_id: 1,
        initiative_id: 1
      });
      const result = await projectService.update(db, created.lastID, {
        initiative_id: 1
      });
      expect(result.changes).toBe(1);
    });

    it('should update deliverypath_id', async () => {
      const created = await projectService.create(db, {
        project_name: 'DeliveryPathProject',
        division_id: 1,
        user_id: 1,
        deliverypath_id: 1
      });
      const result = await projectService.update(db, created.lastID, {
        deliverypath_id: 1
      });
      expect(result.changes).toBe(1);
    });

    it('should update multiple fields at once', async () => {
      const created = await projectService.create(db, {
        project_name: 'MultiFieldProject',
        division_id: 1,
        user_id: 1
      });
      const now = Date.now();
      const result = await projectService.update(db, created.lastID, {
        project_name: 'UpdatedName',
        project_description: 'Updated description',
        project_start_date: now,
        division_id: 1,
        user_id: 1
      });
      expect(result.changes).toBe(1);
      const project = await projectService.getById(db, created.lastID);
      expect(project.project_name).toBe('UpdatedName');
      expect(project.project_description).toBe('Updated description');
      expect(project.project_start_date).toBe(now);
    });

    it('should mark update when only countries change', async () => {
      const created = await projectService.create(db, {
        project_name: 'CountryOnlyUpdate',
        division_id: 1,
        user_id: 1,
        country_codes: [380]
      });
      const result = await projectService.update(db, created.lastID, {
        country_codes: [840]
      });
      expect(result.changes).toBe(1);
    });

    it('should update only countries without changing other fields', async () => {
      const created = await projectService.create(db, {
        project_name: 'OnlyCountriesChange',
        division_id: 1,
        user_id: 1,
        country_codes: []
      });
      const result = await projectService.update(db, created.lastID, {
        country_codes: [380, 840]
      });
      expect(result.changes).toBe(1);
      const project = await projectService.getById(db, created.lastID);
      expect(project.countries.length).toBe(2);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a project', async () => {
      const created = await projectService.create(db, {
        project_name: 'ToBeDeleted',
        division_id: 1,
        user_id: 1
      });
      const result = await projectService.softDelete(db, created.lastID);
      expect(result.changes).toBe(1);
      const project = await projectService.getById(db, created.lastID);
      expect(project).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return dashboard statistics', async () => {
      const stats = await projectService.getStats(db);
      expect(stats.totalProjects).toBeGreaterThanOrEqual(1);
      expect(stats.activeProjects).toBeDefined();
      expect(stats.totalDivisions).toBeGreaterThanOrEqual(1);
      expect(stats.healthDistribution).toBeDefined();
      expect(typeof stats.healthDistribution).toBe('object');
      expect(stats.recentProjects).toBeDefined();
      expect(Array.isArray(stats.recentProjects)).toBe(true);
      expect(stats.recentProjects.length).toBeLessThanOrEqual(5);
    });

    it('should count active projects (started but not ended)', async () => {
      const now = Date.now();
      await projectService.create(db, {
        project_name: 'Active Project',
        division_id: 1,
        user_id: 1,
        project_start_date: now
      });
      const stats = await projectService.getStats(db);
      expect(stats.activeProjects).toBeGreaterThanOrEqual(1);
    });

    it('should include health distribution', async () => {
      // We already have at least one health status from getById tests
      const stats = await projectService.getStats(db);
      expect(stats.healthDistribution).toBeDefined();
    });

    it('should include recent projects with division name', async () => {
      const stats = await projectService.getStats(db);
      expect(stats.recentProjects.length).toBeGreaterThan(0);
      const withDiv = stats.recentProjects.find(p => p.division_name);
      expect(withDiv).toBeDefined();
    });
  });

  describe('supporting divisions', () => {
    it('should create project with supporting divisions', async () => {
      const result = await projectService.create(db, {
        project_name: 'Supporting Div Project',
        division_id: 1,
        user_id: 1,
        supporting_division_ids: [2, 3]
      });
      expect(result.lastID).toBeGreaterThan(0);
      const project = await projectService.getById(db, result.lastID);
      expect(project.supporting_divisions).toBeDefined();
      expect(project.supporting_divisions.length).toBe(2);
    });

    it('should sync supporting divisions on update (replace)', async () => {
      const created = await projectService.create(db, {
        project_name: 'SupportingDivSync',
        division_id: 1,
        user_id: 1,
        supporting_division_ids: [2]
      });
      await projectService.update(db, created.lastID, {
        supporting_division_ids: [3]
      });
      const project = await projectService.getById(db, created.lastID);
      expect(project.supporting_divisions.length).toBe(1);
      expect(project.supporting_divisions[0].id).toBe(3);
    });

    it('should clear supporting divisions with empty array', async () => {
      const created = await projectService.create(db, {
        project_name: 'ClearSupportingDiv',
        division_id: 1,
        user_id: 1,
        supporting_division_ids: [2, 3]
      });
      await projectService.update(db, created.lastID, {
        supporting_division_ids: []
      });
      const project = await projectService.getById(db, created.lastID);
      expect(project.supporting_divisions.length).toBe(0);
    });

    it('should mark update when only supporting divisions change', async () => {
      const created = await projectService.create(db, {
        project_name: 'SupportingDivOnlyUpdate',
        division_id: 1,
        user_id: 1,
        supporting_division_ids: [2]
      });
      const result = await projectService.update(db, created.lastID, {
        supporting_division_ids: [3]
      });
      expect(result.changes).toBe(1);
    });

    it('should exclude main division from supporting divisions', async () => {
      const created = await projectService.create(db, {
        project_name: 'MainDivExcluded',
        division_id: 1,
        user_id: 1,
        supporting_division_ids: [1, 2, 3]
      });
      const project = await projectService.getById(db, created.lastID);
      expect(project.supporting_divisions.length).toBe(2);
      const divIds = project.supporting_divisions.map(d => d.id);
      expect(divIds).not.toContain(1);
      expect(divIds).toContain(2);
      expect(divIds).toContain(3);
    });
  });
});
