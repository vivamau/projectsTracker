const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken } = require('../helpers/testAuth');
const { runQuery } = require('../../config/database');

let db, app;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);

  // Insert test countries since they are not seeded
  await runQuery(db,
    "INSERT INTO countries (ISO2, ISO3, short_name, official_name, UN_country_code, UNDP_country_code) VALUES (?, ?, ?, ?, ?, ?)",
    ['IT', 'ITA', 'Italy', 'Italian Republic', 380, 'ITA']
  );
  await runQuery(db,
    "INSERT INTO countries (ISO2, ISO3, short_name, official_name, UN_country_code, UNDP_country_code) VALUES (?, ?, ?, ?, ?, ?)",
    ['DE', 'DEU', 'Germany', 'Federal Republic of Germany', 276, 'DEU']
  );
  await runQuery(db,
    "INSERT INTO countries (ISO2, ISO3, short_name, official_name, UN_country_code, UNDP_country_code) VALUES (?, ?, ?, ?, ?, ?)",
    ['US', 'USA', 'United States', 'United States of America', 840, 'USA']
  );

  app = createTestApp(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('Country Routes', () => {
  describe('GET /api/countries', () => {
    it('should list all countries when authenticated', async () => {
      const res = await request(app)
        .get('/api/countries')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('should filter countries by search term', async () => {
      const res = await request(app)
        .get('/api/countries?search=Italy')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].short_name).toBe('Italy');
    });

    it('should search by ISO2 code', async () => {
      const res = await request(app)
        .get('/api/countries?search=DE')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/countries');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/countries/:code', () => {
    it('should return a country by UN code', async () => {
      const res = await request(app)
        .get('/api/countries/380')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.short_name).toBe('Italy');
    });

    it('should return 404 for non-existent code', async () => {
      const res = await request(app)
        .get('/api/countries/999')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/countries/380');
      expect(res.status).toBe(401);
    });
  });
});
