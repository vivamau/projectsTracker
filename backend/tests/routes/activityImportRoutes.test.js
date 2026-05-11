const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { superadminToken, readerToken } = require('../helpers/testAuth');
const { buildActivityXlsx, dateToExcel } = require('../helpers/buildTestXlsx');
const projectService = require('../../services/projectService');

let db, app, xlsxBuffer;

const fromSerial = dateToExcel(new Date(Date.UTC(2025, 3, 28)));
const toSerial   = dateToExcel(new Date(Date.UTC(2025, 4, 9)));

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  await projectService.create(db, { project_name: 'SCOPE', division_id: 1, project_code: '127' });
  app = createTestApp(db);

  // Cols: ID, Start, Completion, Email, Name, From, To, Project, Planned, Closed, Bugs, BugsClosed
  xlsxBuffer = await buildActivityXlsx([
    ['1', fromSerial, fromSerial, 'a@wfp.org', 'Alice', fromSerial, toSerial, 'SCOPE (GlassID:127)',  '10', '8', '1', '0'],
    ['2', fromSerial, fromSerial, 'b@wfp.org', 'Bob',   fromSerial, toSerial, 'No ID project',        '5',  '3', '0', '0'],
  ]);
});

afterAll(() => closeTestDb(db));

describe('POST /api/settings/import-activities', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/settings/import-activities')
      .attach('file', xlsxBuffer, { filename: 'activities.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(401);
  });

  it('rejects non-superadmin users', async () => {
    const res = await request(app)
      .post('/api/settings/import-activities')
      .set('Cookie', [`token=${readerToken()}`])
      .attach('file', xlsxBuffer, { filename: 'activities.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when no file uploaded', async () => {
    const res = await request(app)
      .post('/api/settings/import-activities')
      .set('Cookie', [`token=${superadminToken()}`]);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/file/i);
  });

  it('imports rows with valid GlassID and skips those without', async () => {
    const res = await request(app)
      .post('/api/settings/import-activities')
      .set('Cookie', [`token=${superadminToken()}`])
      .attach('file', xlsxBuffer, { filename: 'activities.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.inserted).toBe(1);             // SCOPE (127) inserted
    expect(data.skipped).toBe(0);
    expect(data.unmatched).toHaveLength(1);    // "No ID project" has no GlassID
    expect(data.unmatched[0].rawProject).toBe('No ID project');
  });

  it('skips already-imported rows on second upload (delta)', async () => {
    const res = await request(app)
      .post('/api/settings/import-activities')
      .set('Cookie', [`token=${superadminToken()}`])
      .attach('file', xlsxBuffer, { filename: 'activities.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.status).toBe(200);
    expect(res.body.data.inserted).toBe(0);
    expect(res.body.data.skipped).toBe(1);
  });

  it('rejects non-xlsx files', async () => {
    const res = await request(app)
      .post('/api/settings/import-activities')
      .set('Cookie', [`token=${superadminToken()}`])
      .attach('file', Buffer.from('not a spreadsheet'), { filename: 'data.csv', contentType: 'text/csv' });
    expect(res.status).toBe(400);
  });
});
