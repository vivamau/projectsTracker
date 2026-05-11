const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { buildActivityXlsx, dateToExcel } = require('../helpers/buildTestXlsx');
const {
  parseXlsxBuffer,
  extractProjectName,
  extractGlassId,
  excelToEpoch,
  getExistingImportIds,
  findProjectByCode,
  processRows,
} = require('../../services/activityImportService');
const projectService = require('../../services/projectService');
const { runQuery } = require('../../config/database');

// ── Pure function tests ────────────────────────────────────────────────────

describe('extractProjectName', () => {
  it('extracts name from "OPweb (177)"', () => {
    expect(extractProjectName('OPweb (177)')).toBe('OPweb');
  });

  it('extracts name from "34 - COMET (GlassID:49)"', () => {
    expect(extractProjectName('34 - COMET (GlassID:49)')).toBe('COMET');
  });

  it('extracts name from "School Meals Coalition (1075)"', () => {
    expect(extractProjectName('School Meals Coalition (1075)')).toBe('School Meals Coalition');
  });

  it('returns the raw string when pattern does not match', () => {
    expect(extractProjectName('My Project')).toBe('My Project');
  });

  it('returns empty string for empty input', () => {
    expect(extractProjectName('')).toBe('');
    expect(extractProjectName(null)).toBe('');
  });
});

describe('extractGlassId', () => {
  it('extracts id from "OPweb (177)"', () => {
    expect(extractGlassId('OPweb (177)')).toBe(177);
  });

  it('extracts id from "34 - COMET (GlassID:49)"', () => {
    expect(extractGlassId('34 - COMET (GlassID:49)')).toBe(49);
  });

  it('extracts id from "MoDA (GlassID: 590)" — space after colon', () => {
    expect(extractGlassId('MoDA (GlassID: 590)')).toBe(590);
  });

  it('extracts id from "School Meals Coalition (1075)"', () => {
    expect(extractGlassId('School Meals Coalition (1075)')).toBe(1075);
  });

  it('returns null when no parenthesised number found', () => {
    expect(extractGlassId('My Project')).toBeNull();
    expect(extractGlassId('')).toBeNull();
    expect(extractGlassId(null)).toBeNull();
  });
});

describe('excelToEpoch', () => {
  it('converts Excel serial 45775 to 2025-04-28', () => {
    const d = new Date(excelToEpoch(45775));
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(3);
    expect(d.getUTCDate()).toBe(28);
  });

  it('converts Excel serial 45786 to 2025-05-09', () => {
    const d = new Date(excelToEpoch(45786));
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(4);
    expect(d.getUTCDate()).toBe(9);
  });

  it('handles string input', () => {
    expect(excelToEpoch('45775')).toBe(excelToEpoch(45775));
  });

  it('parses date strings like "4/28/2025"', () => {
    const d = new Date(excelToEpoch('4/28/2025'));
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(3);
  });

  it('returns null for empty/invalid input', () => {
    expect(excelToEpoch('')).toBeNull();
    expect(excelToEpoch(null)).toBeNull();
    expect(excelToEpoch('abc')).toBeNull();
  });
});

// ── parseXlsxBuffer ────────────────────────────────────────────────────────

describe('parseXlsxBuffer', () => {
  let xlsxBuffer;

  const fromSerial = dateToExcel(new Date(Date.UTC(2025, 3, 28)));
  const toSerial   = dateToExcel(new Date(Date.UTC(2025, 4, 9)));

  beforeAll(async () => {
    // Cols: ID, Start, Completion, Email, Name, From, To, Project, Planned, Closed, Bugs, BugsClosed
    xlsxBuffer = await buildActivityXlsx([
      ['1', fromSerial, fromSerial, 'a@wfp.org', 'Alice', fromSerial, toSerial, 'OPweb (GlassID:177)', '9', '8', '1', '0'],
      ['2', fromSerial, fromSerial, 'b@wfp.org', 'Bob',   fromSerial, toSerial, 'ENHANCE (GlassID:1055)', '5', '3', '0', '0'],
    ]);
  });

  it('returns one row per data row (excluding header)', async () => {
    const rows = await parseXlsxBuffer(xlsxBuffer);
    expect(rows).toHaveLength(2);
  });

  it('parses importId, glassId and ticket counts', async () => {
    const rows = await parseXlsxBuffer(xlsxBuffer);
    const r = rows[0];
    expect(r.importId).toBe(1);
    expect(r.rawProject).toBe('OPweb (GlassID:177)');
    expect(r.glassId).toBe(177);
    expect(r.plannedTickets).toBe(9);
    expect(r.closedTickets).toBe(8);
    expect(r.bugTickets).toBe(1);
    expect(r.bugClosedTickets).toBe(0);
  });

  it('converts Excel serial dates to epoch milliseconds', async () => {
    const rows = await parseXlsxBuffer(xlsxBuffer);
    const d = new Date(rows[0].activityFrom);
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(3);
    expect(d.getUTCDate()).toBe(28);
  });

  it('returns empty array for a buffer with only a header row', async () => {
    const buf = await buildActivityXlsx([]);
    const rows = await parseXlsxBuffer(buf);
    expect(rows).toHaveLength(0);
  });
});

// ── DB tests ───────────────────────────────────────────────────────────────

describe('findProjectByCode', () => {
  let db, projectId;
  beforeAll(async () => {
    db = await initTestDb();
    await seedTestDb(db);
    const r = await projectService.create(db, { project_name: 'OPweb Portal', division_id: 1, project_code: '177' });
    projectId = r.lastID;
  });
  afterAll(() => closeTestDb(db));

  it('finds a project by project_code string', async () => {
    const p = await findProjectByCode(db, '177');
    expect(p).not.toBeNull();
  });

  it('also accepts a numeric glassId', async () => {
    const p = await findProjectByCode(db, 177);
    expect(p).not.toBeNull();
  });

  it('returns null when no project matches', async () => {
    expect(await findProjectByCode(db, '9999')).toBeNull();
    expect(await findProjectByCode(db, null)).toBeNull();
  });
});

describe('getExistingImportIds', () => {
  let db;
  beforeAll(async () => {
    db = await initTestDb();
    await seedTestDb(db);
  });
  afterAll(() => closeTestDb(db));

  it('returns an empty Set when no activities exist', async () => {
    const ids = await getExistingImportIds(db);
    expect(ids.size).toBe(0);
  });

  it('returns a Set containing inserted import IDs', async () => {
    const now = Date.now();
    await runQuery(db,
      `INSERT INTO activities (project_code, activity_from, activity_to, activity_import_id, activity_create_date) VALUES (?, ?, ?, ?, ?)`,
      [177, now, now, 42, now]
    );
    const ids = await getExistingImportIds(db);
    expect(ids.has(42)).toBe(true);
    expect(ids.has(99)).toBe(false);
  });
});

describe('processRows', () => {
  let db;

  const fromEpoch = new Date(Date.UTC(2025, 3, 28)).getTime();
  const toEpoch   = new Date(Date.UTC(2025, 4, 9)).getTime();

  beforeAll(async () => {
    db = await initTestDb();
    await seedTestDb(db);
    await projectService.create(db, { project_name: 'OPweb Portal', division_id: 1, project_code: '177' });
  });
  afterAll(() => closeTestDb(db));

  it('inserts rows whose project_code exists in projects, skips others', async () => {
    const rows = [
      { importId: 10, rawProject: 'OPweb (GlassID:177)', glassId: 177, activityFrom: fromEpoch, activityTo: toEpoch, plannedTickets: 9, closedTickets: 8, bugTickets: 1, bugClosedTickets: 0 },
      { importId: 11, rawProject: 'Unknown (GlassID:999)', glassId: 999, activityFrom: fromEpoch, activityTo: toEpoch, plannedTickets: 5, closedTickets: 3, bugTickets: 0, bugClosedTickets: 0 },
      { importId: 12, rawProject: 'No ID project', glassId: null, activityFrom: fromEpoch, activityTo: toEpoch, plannedTickets: 5, closedTickets: 3, bugTickets: 0, bugClosedTickets: 0 },
    ];
    const result = await processRows(db, rows);
    expect(result.inserted).toBe(1);          // only OPweb matched
    expect(result.unmatched).toHaveLength(2); // 999 not in projects, null glassId
  });

  it('applies the delta: skips rows with importId <= lastImportId', async () => {
    const rows = [
      { importId: 10, rawProject: 'OPweb (177)', glassId: 177, activityFrom: fromEpoch, activityTo: toEpoch + 1000, plannedTickets: 99, closedTickets: 99, bugTickets: 0, bugClosedTickets: 0 },
      { importId: 12, rawProject: 'OPweb (177)', glassId: 177, activityFrom: fromEpoch, activityTo: toEpoch + 2000, plannedTickets: 3, closedTickets: 2, bugTickets: 0, bugClosedTickets: 0 },
    ];
    const result = await processRows(db, rows);
    expect(result.inserted).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('returns zero inserted when all rows already imported', async () => {
    const rows = [
      { importId: 10, rawProject: 'OPweb (177)', glassId: 177, activityFrom: fromEpoch, activityTo: toEpoch, plannedTickets: 1, closedTickets: 1, bugTickets: 0, bugClosedTickets: 0 },
    ];
    const result = await processRows(db, rows);
    expect(result.inserted).toBe(0);
    expect(result.skipped).toBe(1);
  });
});
