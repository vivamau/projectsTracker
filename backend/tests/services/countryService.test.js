const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { runQuery } = require('../../config/database');
const countryService = require('../../services/countryService');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  // Seed test countries
  await runQuery(db,
    "INSERT INTO countries (ISO2, ISO3, short_name, official_name, UN_country_code, UNDP_country_code) VALUES (?, ?, ?, ?, ?, ?)",
    ['IT', 'ITA', 'Italy', 'Italian Republic', 380, 'ITA']
  );
  await runQuery(db,
    "INSERT INTO countries (ISO2, ISO3, short_name, official_name, UN_country_code, UNDP_country_code) VALUES (?, ?, ?, ?, ?, ?)",
    ['US', 'USA', 'United States', 'United States of America', 840, 'USA']
  );
  await runQuery(db,
    "INSERT INTO countries (ISO2, ISO3, short_name, official_name, UN_country_code, UNDP_country_code) VALUES (?, ?, ?, ?, ?, ?)",
    ['DE', 'DEU', 'Germany', 'Federal Republic of Germany', 276, 'DEU']
  );

  // Seed a project and link it to Italy
  await runQuery(db,
    "INSERT INTO projects (project_name, project_create_date, division_id) VALUES (?, ?, ?)",
    ['Alpha Project', Date.now(), 1]
  );
  await runQuery(db,
    "INSERT INTO projects_to_countries (UN_country_code, project_id) VALUES (?, ?)",
    [380, 1]
  );
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('countryService', () => {
  describe('getAll', () => {
    it('should return all countries ordered by short_name', async () => {
      const countries = await countryService.getAll(db);
      expect(countries.length).toBe(3);
      expect(countries[0].short_name).toBe('Germany');
      expect(countries[1].short_name).toBe('Italy');
      expect(countries[2].short_name).toBe('United States');
    });

    it('should filter by search term on name', async () => {
      const countries = await countryService.getAll(db, 'Italy');
      expect(countries.length).toBe(1);
      expect(countries[0].UN_country_code).toBe(380);
    });

    it('should filter by search term on ISO code', async () => {
      const countries = await countryService.getAll(db, 'US');
      expect(countries.length).toBe(1);
      expect(countries[0].short_name).toBe('United States');
    });

    it('should return empty array for no matches', async () => {
      const countries = await countryService.getAll(db, 'Narnia');
      expect(countries).toEqual([]);
    });
  });

  describe('getByCode', () => {
    it('should return a country by UN code', async () => {
      const country = await countryService.getByCode(db, 380);
      expect(country).not.toBeNull();
      expect(country.short_name).toBe('Italy');
      expect(country.ISO2).toBe('IT');
    });

    it('should return null for non-existent code', async () => {
      const country = await countryService.getByCode(db, 9999);
      expect(country).toBeNull();
    });
  });

  describe('getProjectsByCountry', () => {
    it('should return projects linked to a country', async () => {
      const projects = await countryService.getProjectsByCountry(db, 380);
      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBe(1);
      expect(projects[0].project_name).toBe('Alpha Project');
    });

    it('should include division_name in results', async () => {
      const projects = await countryService.getProjectsByCountry(db, 380);
      expect(projects[0]).toHaveProperty('division_name');
      expect(projects[0].division_name).toBe('Engineering');
    });

    it('should return empty array for country with no projects', async () => {
      const projects = await countryService.getProjectsByCountry(db, 840);
      expect(projects).toEqual([]);
    });

    it('should return empty array for non-existent country code', async () => {
      const projects = await countryService.getProjectsByCountry(db, 9999);
      expect(projects).toEqual([]);
    });
  });

  describe('getCountriesWithProjects', () => {
    it('should return only countries that have projects', async () => {
      const countries = await countryService.getCountriesWithProjects(db);
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBe(1);
      expect(countries[0].short_name).toBe('Italy');
    });

    it('should include project_count in results', async () => {
      const countries = await countryService.getCountriesWithProjects(db);
      expect(countries[0]).toHaveProperty('project_count');
      expect(countries[0].project_count).toBe(1);
    });
  });
});
