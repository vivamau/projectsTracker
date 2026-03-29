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
});
