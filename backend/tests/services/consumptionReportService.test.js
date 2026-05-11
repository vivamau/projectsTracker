const { parseReportText, parsePeriod, matchResourcesToItems } = require('../../services/consumptionReportService');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { findMatchingPO, getItemsForPO, applyReport } = require('../../services/consumptionReportService');
const purchaseOrderService = require('../../services/purchaseOrderService');
const purchaseOrderItemService = require('../../services/purchaseOrderItemService');
const budgetService = require('../../services/budgetService');
const vendorService = require('../../services/vendorService');
const projectService = require('../../services/projectService');
const poitemConsumptionService = require('../../services/poitemConsumptionService');

const SAMPLE_TEXT = `
Consumption report for Reckon Digital, time-and-materials Purchase Order

Vendor name: Reckon Digital Project name: Partner Connect Project focal-point(s): Stefania Corsi, Marco Vittorini@wfp.org
Purchase Order (PO): PO 1000011089
Total number of days on the PO: 66
PO amount: EUR 39600
daily rate EUR 600

Invoice related to period: April 2026
Days consumed during this period: 20

Total days consumed so-far: 46.4375
Days left on the Purchase Order: 19.5625
amount left on PO: 11737.5

List the names and roles of the individuals involved during this period:
 ● Charlie Wills, Senior Full-stack software engineer

Name  Role  daily rate  days  Monthly
April  Full-stack software engineer  EUR 600  20  EUR 12000

Total  EUR 12000
`;

describe('parsePeriod', () => {
  it('parses a standard month-year string to epoch', () => {
    const epoch = parsePeriod('April 2026');
    expect(epoch).toBe(new Date(2026, 3, 1).getTime());
  });

  it('parses short month names', () => {
    const epoch = parsePeriod('Jan 2025');
    expect(epoch).toBe(new Date(2025, 0, 1).getTime());
  });

  it('returns null for invalid input', () => {
    expect(parsePeriod('not a date')).toBeNull();
    expect(parsePeriod('')).toBeNull();
    expect(parsePeriod(null)).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(parsePeriod('APRIL 2026')).toBe(new Date(2026, 3, 1).getTime());
    expect(parsePeriod('april 2026')).toBe(new Date(2026, 3, 1).getTime());
  });
});

describe('parseReportText', () => {
  it('extracts the PO number', () => {
    const result = parseReportText(SAMPLE_TEXT);
    expect(result.poNumber).toBe('1000011089');
  });

  it('extracts vendor name', () => {
    const result = parseReportText(SAMPLE_TEXT);
    expect(result.vendorName).toBe('Reckon Digital');
  });

  it('extracts project name', () => {
    const result = parseReportText(SAMPLE_TEXT);
    expect(result.projectName).toBe('Partner Connect');
  });

  it('extracts the period epoch', () => {
    const result = parseReportText(SAMPLE_TEXT);
    expect(result.periodEpoch).toBe(new Date(2026, 3, 1).getTime());
    expect(result.periodStr).toMatch(/april/i);
  });

  it('extracts days consumed this period', () => {
    const result = parseReportText(SAMPLE_TEXT);
    expect(result.daysConsumed).toBe(20);
  });

  it('extracts total days on PO', () => {
    const result = parseReportText(SAMPLE_TEXT);
    expect(result.totalDaysOnPO).toBe(66);
  });

  it('extracts PO amount and currency', () => {
    const result = parseReportText(SAMPLE_TEXT);
    expect(result.poAmount).toBe(39600);
    expect(result.currency).toBe('EUR');
  });

  it('extracts daily rate', () => {
    const result = parseReportText(SAMPLE_TEXT);
    expect(result.dailyRate).toBe(600);
  });

  it('extracts resources from bullet points', () => {
    const result = parseReportText(SAMPLE_TEXT);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].fullName).toBe('Charlie Wills');
    expect(result.resources[0].role).toMatch(/full-stack software engineer/i);
  });

  it('extracts per-resource days from table', () => {
    const result = parseReportText(SAMPLE_TEXT);
    expect(result.resources[0].daysConsumed).toBe(20);
  });

  it('returns nulls gracefully for missing fields', () => {
    const result = parseReportText('Some random text with no structure');
    expect(result.poNumber).toBeNull();
    expect(result.daysConsumed).toBeNull();
    expect(result.resources).toEqual([]);
  });

  it('handles decimal days with dot separator', () => {
    const text = SAMPLE_TEXT.replace('Days consumed during this period: 20', 'Days consumed during this period: 7.5');
    const result = parseReportText(text);
    expect(result.daysConsumed).toBe(7.5);
  });
});

describe('matchResourcesToItems', () => {
  const poItems = [
    {
      id: 10,
      vendorresource_name: 'Charlie',
      vendorresource_lastname: 'Wills',
      vendorcontractrole_name: 'Senior Full-stack software engineer',
      purchaseorderitems_days: 66,
      total_days_consumed: 26
    },
    {
      id: 11,
      vendorresource_name: 'Jane',
      vendorresource_lastname: 'Doe',
      vendorcontractrole_name: 'Project Manager',
      purchaseorderitems_days: 20,
      total_days_consumed: 0
    }
  ];

  it('matches resource to item by full name', () => {
    const resources = [{ fullName: 'Charlie Wills', role: 'Senior Full-stack software engineer', daysConsumed: 20 }];
    const { matches, unmatched } = matchResourcesToItems(poItems, resources);
    expect(matches).toHaveLength(1);
    expect(matches[0].item.id).toBe(10);
    expect(unmatched).toHaveLength(0);
  });

  it('is case-insensitive in name matching', () => {
    const resources = [{ fullName: 'charlie wills', role: 'engineer', daysConsumed: 5 }];
    const { matches } = matchResourcesToItems(poItems, resources);
    expect(matches[0].item.id).toBe(10);
  });

  it('falls back to role matching when name does not match', () => {
    const resources = [{ fullName: 'Unknown Person', role: 'project manager', daysConsumed: 5 }];
    const { matches } = matchResourcesToItems(poItems, resources);
    expect(matches[0].item.id).toBe(11);
  });

  it('auto-matches single resource to single item when names differ', () => {
    const singleItem = [{ id: 10, vendorresource_name: null, vendorresource_lastname: null, vendorcontractrole_name: null }];
    const resources = [{ fullName: 'Unknown', role: 'Unknown', daysConsumed: 10 }];
    const { matches, unmatched } = matchResourcesToItems(singleItem, resources);
    expect(matches).toHaveLength(1);
    expect(unmatched).toHaveLength(0);
  });

  it('returns unmatched when no match found and multiple items exist', () => {
    const resources = [{ fullName: 'Nobody Known', role: 'Wizard', daysConsumed: 5 }];
    const { matches, unmatched } = matchResourcesToItems(poItems, resources);
    expect(matches).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
  });

  it('handles multiple resources', () => {
    const resources = [
      { fullName: 'Charlie Wills', role: 'engineer', daysConsumed: 20 },
      { fullName: 'Jane Doe', role: 'project manager', daysConsumed: 10 }
    ];
    const { matches, unmatched } = matchResourcesToItems(poItems, resources);
    expect(matches).toHaveLength(2);
    expect(unmatched).toHaveLength(0);
  });
});

describe('findMatchingPO (DB)', () => {
  let db, poId;

  beforeAll(async () => {
    db = await initTestDb();
    await seedTestDb(db);

    const vendorRes = await vendorService.create(db, { vendor_name: 'Reckon Digital', vendor_email: 'rd@test.com' });
    const budgetRes = await budgetService.create(db, { budget_amount: 50000, budget_start_date: Date.now() });
    const poRes = await purchaseOrderService.create(db, {
      purchaseorder_description: 'WFP PO 1000011089',
      purchaseorder_start_date: Date.now(),
      budget_id: budgetRes.lastID,
      vendor_id: vendorRes.lastID
    });
    poId = poRes.lastID;
  });

  afterAll(() => closeTestDb(db));

  it('finds PO by number embedded in description', async () => {
    const po = await findMatchingPO(db, '1000011089');
    expect(po).not.toBeNull();
    expect(po.id).toBe(poId);
  });

  it('returns null when PO number not found', async () => {
    const po = await findMatchingPO(db, '9999999999');
    expect(po).toBeNull();
  });

  it('returns null for null input', async () => {
    const po = await findMatchingPO(db, null);
    expect(po).toBeNull();
  });
});

describe('applyReport (DB)', () => {
  let db, itemId;

  beforeAll(async () => {
    db = await initTestDb();
    await seedTestDb(db);

    const vendorRes = await vendorService.create(db, { vendor_name: 'Apply Vendor', vendor_email: 'av@test.com' });
    const budgetRes = await budgetService.create(db, { budget_amount: 50000, budget_start_date: Date.now() });
    const poRes = await purchaseOrderService.create(db, {
      purchaseorder_description: 'Apply PO',
      purchaseorder_start_date: Date.now(),
      budget_id: budgetRes.lastID,
      vendor_id: vendorRes.lastID
    });
    const itemRes = await purchaseOrderItemService.create(db, {
      purchaseorderitem_description: 'Apply Item',
      purchaseorderitem_start_date: Date.now(),
      purchaseorderitems_days: 20,
      purchaseorder_id: poRes.lastID
    });
    itemId = itemRes.lastID;
  });

  afterAll(() => closeTestDb(db));

  const consumptionMonth = new Date(2026, 3, 1).getTime();

  it('creates consumption entries for each matched item', async () => {
    const entries = [
      { purchaseorderitem_id: itemId, consumption_days: 20, consumption_month: consumptionMonth, consumption_comment: 'April 2026' }
    ];
    const result = await applyReport(db, entries, 2);
    expect(result).toHaveLength(1);
    expect(result[0].lastID).toBeGreaterThan(0);

    const summary = await poitemConsumptionService.getByItemIdWithSummary(db, itemId);
    expect(summary.total_days_used).toBe(20);
  });

  it('throws on duplicate month for same item', async () => {
    const entries = [
      { purchaseorderitem_id: itemId, consumption_days: 5, consumption_month: consumptionMonth, consumption_comment: 'Dup' }
    ];
    await expect(applyReport(db, entries, 2)).rejects.toThrow();
  });
});
