const JSZip = require('jszip');
const { getOne, getAll, runQuery } = require('../config/database');

// Header name fragments used to discover column positions at runtime.
// Matching is case-insensitive and checks if the header CONTAINS the fragment.
// Fragments matched case-insensitively against header cell text (contains check).
// More specific fragments are listed first to avoid ambiguous matches.
const HEADER_MAP = {
  ID:          'id',
  FROM:        'from',
  TO:          'to',
  PROJECT:     'select your project',
  PLANNED:     'planned',
  BUGS_CLOSED: 'closed bug',   // "Number of closed bugs" — must come before CLOSED
  CLOSED:      'closed ticket',// "Number of closed ticket"
  BUGS:        'opened bug',   // "Number of opened bugs"
};

function colLetterToIdx(col) {
  let idx = 0;
  for (const ch of col) idx = idx * 26 + ch.charCodeAt(0) - 64;
  return idx - 1;
}

function excelToEpoch(serial) {
  if (serial === null || serial === undefined || serial === '') return null;
  const str = String(serial).trim();
  // Pure numeric → Excel serial date
  if (/^\d+(\.\d+)?$/.test(str)) {
    return Math.round((parseFloat(str) - 25569) * 86400) * 1000;
  }
  // Fallback: parse date strings like "4/28/2025" or "2025-04-28"
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function extractProjectName(raw) {
  if (!raw) return '';
  const m = raw.match(/^(?:\d+\s*-\s*)?(.+?)\s*\([^)]+\)$/);
  return m ? m[1].trim() : raw.trim();
}

// Extracts the numeric GlassID from the parenthesised suffix.
// "OPweb (177)" → 177  |  "34 - COMET (GlassID:49)" → 49  |  "MoDA (GlassID: 590)" → 590
function extractGlassId(raw) {
  if (!raw) return null;
  const m = raw.match(/\((?:[^):]*:)?\s*(\d+)\)\s*$/);
  return m ? parseInt(m[1]) : null;
}

function extractTexts(xml) {
  const texts = [];
  const tRe = /<(?:x:)?t[^>]*>(.*?)<\/(?:x:)?t>/gs;
  let tm;
  while ((tm = tRe.exec(xml)) !== null) texts.push(tm[1]);
  return texts.join('');
}

async function parseXlsxBuffer(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  // Parse shared strings (may not exist if all values are inline or numeric)
  const strings = [];
  const ssFile = zip.file('xl/sharedStrings.xml');
  if (ssFile) {
    const ssXml = await ssFile.async('string');
    const siRe = /<(?:x:)?si>(.*?)<\/(?:x:)?si>/gs;
    let m;
    while ((m = siRe.exec(ssXml)) !== null) strings.push(extractTexts(m[1]));
  }

  // Find first sheet path from workbook.xml relationships
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wbRelsFile = zip.file('xl/_rels/workbook.xml.rels');
  if (wbRelsFile) {
    const wbRels = await wbRelsFile.async('string');
    const relM = wbRels.match(/Target="worksheets\/([^"]+)"/);
    if (relM) sheetPath = `xl/worksheets/${relM[1]}`;
  }

  const shFile = zip.file(sheetPath);
  if (!shFile) throw new Error(`Sheet not found at ${sheetPath}`);
  const shXml = await shFile.async('string');

  const rowRe = /<(?:x:)?row[^>]*r="(\d+)"[^>]*>(.*?)<\/(?:x:)?row>/gs;
  const cellRe = /<(?:x:)?c\s+r="([A-Z]+)\d+"([^>]*)(?<!\/)>(.*?)<\/(?:x:)?c>/gs;

  function parseCells(rowXml, maxCols = 50) {
    const cells = new Array(maxCols).fill('');
    let cm;
    cellRe.lastIndex = 0;
    while ((cm = cellRe.exec(rowXml)) !== null) {
      const idx = colLetterToIdx(cm[1]);
      if (idx >= maxCols) continue;
      const t = (cm[2].match(/\st="([^"]+)"/) || [])[1] || '';
      const raw = (cm[3].match(/<(?:x:)?v>(.*?)<\/(?:x:)?v>/) || [])[1] || '';
      let val;
      if (t === 's') val = strings[parseInt(raw)] ?? '';
      else if (t === 'inlineStr') val = extractTexts(cm[3]);
      else val = raw;
      cells[idx] = val;
    }
    return cells;
  }

  // Discover column indices from the header row
  let COL = null;
  const rows = [];
  let m;

  while ((m = rowRe.exec(shXml)) !== null) {
    const rowNum = parseInt(m[1]);

    if (rowNum === 1) {
      const headers = parseCells(m[2]);
      COL = {};
      for (const [key, fragment] of Object.entries(HEADER_MAP)) {
        const idx = headers.findIndex(h => h.toLowerCase().includes(fragment));
        COL[key] = idx >= 0 ? idx : -1;
      }
      continue;
    }

    if (!COL || COL.ID < 0 || COL.PROJECT < 0) continue;

    const cells = parseCells(m[2]);
    const importId = parseInt(cells[COL.ID]);
    if (!importId) continue;

    rows.push({
      importId,
      rawProject:       cells[COL.PROJECT],
      glassId:          extractGlassId(cells[COL.PROJECT]),
      activityFrom:     COL.FROM >= 0 ? excelToEpoch(cells[COL.FROM]) : null,
      activityTo:       COL.TO   >= 0 ? excelToEpoch(cells[COL.TO])   : null,
      plannedTickets:   COL.PLANNED     >= 0 ? parseInt(cells[COL.PLANNED])     || 0 : 0,
      closedTickets:    COL.CLOSED      >= 0 ? parseInt(cells[COL.CLOSED])      || 0 : 0,
      bugTickets:       COL.BUGS        >= 0 ? parseInt(cells[COL.BUGS])        || 0 : 0,
      bugClosedTickets: COL.BUGS_CLOSED >= 0 ? parseInt(cells[COL.BUGS_CLOSED]) || 0 : 0,
    });
  }

  return rows;
}

async function getExistingImportIds(db) {
  const rows = await getAll(db,
    `SELECT activity_import_id FROM activities
     WHERE activity_import_id IS NOT NULL
       AND (activity_is_deleted = 0 OR activity_is_deleted IS NULL)`
  );
  return new Set(rows.map(r => r.activity_import_id));
}

async function findProjectByCode(db, code) {
  if (!code) return null;
  const row = await getOne(db,
    `SELECT project_code FROM projects
     WHERE project_code = ?
       AND (project_is_deleted = 0 OR project_is_deleted IS NULL)
     LIMIT 1`,
    [String(code)]
  );
  return row || null;
}

async function processRows(db, rows, { reset = false } = {}) {
  if (reset) {
    await runQuery(db, `DELETE FROM activities`);
  }
  const existing = await getExistingImportIds(db);
  const now = Date.now();
  let inserted = 0;
  let skipped = 0;
  const unmatched = [];

  for (const row of rows) {
    if (existing.has(row.importId)) {
      skipped++;
      continue;
    }

    // Skip rows with no valid GlassID or missing dates
    if (!row.glassId || !row.activityFrom || !row.activityTo) {
      unmatched.push({ importId: row.importId, rawProject: row.rawProject, glassId: row.glassId });
      continue;
    }

    // Only insert if a project with this project_code exists
    const project = await findProjectByCode(db, row.glassId);
    if (!project) {
      unmatched.push({ importId: row.importId, rawProject: row.rawProject, glassId: row.glassId });
      continue;
    }

    await runQuery(db,
      `INSERT INTO activities
         (project_code, activity_from, activity_to,
          activity_planned_tickets, activity_closed_tickets,
          activity_bug_tickets, activity_bug_closed_tickets,
          activity_import_id, activity_create_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(row.glassId),
        row.activityFrom,
        row.activityTo,
        row.plannedTickets,
        row.closedTickets,
        row.bugTickets,
        row.bugClosedTickets,
        row.importId,
        now,
      ]
    );
    inserted++;
  }

  return { inserted, skipped, unmatched };
}

async function importActivities(db, buffer, { reset = false } = {}) {
  const rows = await parseXlsxBuffer(buffer);
  return processRows(db, rows, { reset });
}

module.exports = {
  parseXlsxBuffer,
  extractProjectName,
  extractGlassId,
  excelToEpoch,
  getExistingImportIds,
  findProjectByCode,
  processRows,
  importActivities,
};
