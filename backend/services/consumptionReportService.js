const { getAll } = require('../config/database');
const poitemConsumptionService = require('./poitemConsumptionService');

const MONTH_NAMES = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

function parsePeriod(periodStr) {
  if (!periodStr) return null;
  const m = periodStr.match(/(\w+)\s+(\d{4})/);
  if (!m) return null;
  const monthIdx = MONTH_NAMES[m[1].toLowerCase()];
  const year = parseInt(m[2]);
  if (monthIdx === undefined || isNaN(year)) return null;
  return new Date(year, monthIdx, 1).getTime();
}

function parseNumber(str) {
  if (str === null || str === undefined) return null;
  const normalized = String(str)
    .replace(/(\d)E(\d)/g, '$1.$2')
    .replace(/,/g, '');
  const val = parseFloat(normalized);
  return isNaN(val) ? null : val;
}

function extractField(text, pattern) {
  const m = text.match(new RegExp(pattern, 'i'));
  return m ? m[1].trim() : null;
}

function parseReportText(text) {
  const poNumber = extractField(text, 'Purchase Order \\(PO\\):\\s*PO\\s+(\\S+)');
  const vendorName = extractField(text, 'Vendor name:\\s*([^\\n]+?)\\s+Project name:');
  const projectName = extractField(text, 'Project name:\\s*([^\\n]+?)\\s+Project focal-point');
  const periodStr = extractField(text, 'Invoice related to period:\\s*([^\\n]+?)(?:\\s+Days consumed|$)');
  const daysConsumedStr = extractField(text, 'Days consumed during this period:\\s*([\\d.E,]+)');
  const totalDaysOnPOStr = extractField(text, 'Total number of days on the PO:\\s*([\\d.E,]+)');
  const poAmountStr = extractField(text, 'PO amount:\\s*\\w+\\s+([\\d,.E]+)');
  const currencyMatch = text.match(/PO amount:\s*([A-Z]{3})\s/i);
  const dailyRateStr = extractField(text, 'daily rate\\s+[A-Z]{3}\\s+([\\d,.E]+)');

  const daysConsumed = parseNumber(daysConsumedStr);
  const totalDaysOnPO = parseNumber(totalDaysOnPOStr);
  const poAmount = parseNumber(poAmountStr);
  const dailyRate = parseNumber(dailyRateStr);
  const currency = currencyMatch ? currencyMatch[1].toUpperCase() : null;
  const periodEpoch = periodStr ? parsePeriod(periodStr) : null;

  // Extract resources from bullet points (● Name, Role)
  const resources = [];
  const bulletRe = /●\s*([^,●\n]+),\s*([^●\n]+)/g;
  let bm;
  while ((bm = bulletRe.exec(text)) !== null) {
    resources.push({
      fullName: bm[1].trim(),
      role: bm[2].trim(),
      daysConsumed: null
    });
  }

  // Associate per-resource days from table rows: "EUR {rate} {days} EUR {total}"
  const tableRe = /[A-Z]{3}\s+([\d,.E]+)\s+([\d,.E]+)\s+[A-Z]{3}\s+([\d,.E]+)/g;
  let tm;
  let resourceIdx = 0;
  while ((tm = tableRe.exec(text)) !== null && resourceIdx < resources.length) {
    const days = parseNumber(tm[2]);
    if (days !== null) {
      resources[resourceIdx].daysConsumed = days;
      resourceIdx++;
    }
  }

  // Fallback: if single resource and no per-row days, use the report total
  if (resources.length === 1 && resources[0].daysConsumed === null && daysConsumed !== null) {
    resources[0].daysConsumed = daysConsumed;
  }

  return {
    poNumber,
    vendorName,
    projectName,
    periodStr,
    periodEpoch,
    daysConsumed,
    totalDaysOnPO,
    poAmount,
    dailyRate,
    currency,
    resources
  };
}

function matchResourcesToItems(poItems, reportResources) {
  const matches = [];
  const unmatched = [];

  for (const resource of reportResources) {
    const normalName = resource.fullName.toLowerCase();
    let matchedItem = null;

    for (const item of poItems) {
      const itemFullName = `${item.vendorresource_name || ''} ${item.vendorresource_lastname || ''}`.trim().toLowerCase();
      if (itemFullName && (normalName.includes(itemFullName) || itemFullName.includes(normalName))) {
        matchedItem = item;
        break;
      }
      const roleName = (item.vendorcontractrole_name || '').toLowerCase();
      if (roleName && resource.role.toLowerCase().includes(roleName)) {
        matchedItem = item;
        break;
      }
    }

    if (matchedItem) {
      matches.push({ item: matchedItem, resource });
    } else {
      unmatched.push(resource);
    }
  }

  // Auto-match if exactly 1 item and 1 resource and nothing matched
  if (matches.length === 0 && poItems.length === 1 && reportResources.length === 1) {
    return { matches: [{ item: poItems[0], resource: reportResources[0] }], unmatched: [] };
  }

  return { matches, unmatched };
}

async function findMatchingPO(db, poNumber) {
  if (!poNumber) return null;
  const rows = await getAll(db,
    `SELECT po.*, v.vendor_name
     FROM purchaseorders po
     LEFT JOIN vendors v ON po.vendor_id = v.id
     WHERE po.purchaseorder_description LIKE ?
       AND (po.purchaseorder_is_deleted = 0 OR po.purchaseorder_is_deleted IS NULL)
     LIMIT 1`,
    [`%${poNumber}%`]
  );
  return rows.length > 0 ? rows[0] : null;
}

async function getItemsForPO(db, poId) {
  const { getAll: getAllLocal } = require('../config/database');
  return getAllLocal(db,
    `SELECT poi.*, c.currency_name, vcr.vendorcontractrole_name,
            vr.vendorresource_name, vr.vendorresource_lastname,
            COALESCE(cons.total_days_consumed, 0) as total_days_consumed
     FROM purchaseorderitems poi
     LEFT JOIN currencies c ON poi.currency_id = c.id
     LEFT JOIN vendorcontractroles vcr ON poi.vendorcontractrole_id = vcr.id
     LEFT JOIN vendorresources vr ON poi.vendorresource_id = vr.id
     LEFT JOIN (
       SELECT purchaseorderitem_id, SUM(consumption_days) as total_days_consumed
       FROM poitem_consumptions
       WHERE (consumption_is_deleted = 0 OR consumption_is_deleted IS NULL)
       GROUP BY purchaseorderitem_id
     ) cons ON poi.id = cons.purchaseorderitem_id
     WHERE poi.purchaseorder_id = ?
       AND (poi.purchaseorderitem_is_deleted = 0 OR poi.purchaseorderitem_is_deleted IS NULL)`,
    [poId]
  );
}

async function applyReport(db, entries, userId) {
  const results = [];
  for (const entry of entries) {
    const result = await poitemConsumptionService.create(db, {
      purchaseorderitem_id: entry.purchaseorderitem_id,
      consumption_month: entry.consumption_month,
      consumption_days: entry.consumption_days,
      consumption_comment: entry.consumption_comment || null,
      user_id: userId
    });
    results.push(result);
  }
  return results;
}

module.exports = {
  parseReportText,
  parsePeriod,
  matchResourcesToItems,
  findMatchingPO,
  getItemsForPO,
  applyReport
};
