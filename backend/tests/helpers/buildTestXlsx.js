const JSZip = require('jszip');

// Matches real Azure DevOps Ticket Summary export header names.
// Column discovery in the parser uses contains() matching on these names.
const XLSX_HEADERS = [
  'ID', 'Start time', 'Completion time', 'Email', 'Name',
  'From', 'To',
  'Select your project',
  'Number of planned tickets (no bugs)',
  'Number of closed ticket (no bugs)',
  'Number of opened bugs',
  'Number of closed bugs'
];

// Converts a JS Date to an Excel serial date number
function dateToExcel(date) {
  return (date.getTime() / 86400000) + 25569;
}

// Build a minimal valid XLSX buffer from row arrays
async function buildTestXlsx(rows) {
  const zip = new JSZip();
  const colLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const strings = [];
  const stringMap = new Map();
  function getStringIdx(val) {
    if (!stringMap.has(val)) { stringMap.set(val, strings.length); strings.push(val); }
    return stringMap.get(val);
  }

  let sheetXml = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>`;
  for (let ri = 0; ri < rows.length; ri++) {
    const rowNum = ri + 1;
    sheetXml += `<row r="${rowNum}">`;
    for (let ci = 0; ci < rows[ri].length; ci++) {
      const ref = `${colLetters[ci]}${rowNum}`;
      const val = rows[ri][ci];
      if (val === null || val === undefined || val === '') {
        sheetXml += `<c r="${ref}"/>`;
      } else if (typeof val === 'number') {
        sheetXml += `<c r="${ref}"><v>${val}</v></c>`;
      } else {
        sheetXml += `<c r="${ref}" t="s"><v>${getStringIdx(String(val))}</v></c>`;
      }
    }
    sheetXml += `</row>`;
  }
  sheetXml += `</sheetData></worksheet>`;

  let ssXml = `<?xml version="1.0" encoding="UTF-8"?><sst count="${strings.length}" uniqueCount="${strings.length}" xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`;
  for (const s of strings) {
    ssXml += `<si><t xml:space="preserve">${s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t></si>`;
  }
  ssXml += '</sst>';

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`);
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file('xl/sharedStrings.xml', ssXml);
  zip.file('xl/worksheets/sheet1.xml', sheetXml);

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Build a test XLSX with the exact column layout of the real Azure DevOps export.
// Column F (index 5) = sprint FROM date (Excel serial), column H (index 7) = TO date.
async function buildActivityXlsx(dataRows) {
  const rows = [XLSX_HEADERS, ...dataRows];
  return buildTestXlsx(rows);
}

module.exports = { buildTestXlsx, buildActivityXlsx, dateToExcel, XLSX_HEADERS };
