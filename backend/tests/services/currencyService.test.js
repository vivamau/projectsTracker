const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const currencyService = require('../../services/currencyService');
const { runQuery } = require('../../config/database');

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);

  await runQuery(db, "INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)", ['USD', Date.now()]);
  await runQuery(db, "INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)", ['EUR', Date.now()]);
  await runQuery(db, "INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)", ['GBP', Date.now()]);
});

afterAll(async () => {
  await closeTestDb(db);
});

describe('currencyService.getAll', () => {
  it('should return all currencies', async () => {
    const currencies = await currencyService.getAll(db);
    expect(currencies.length).toBe(3);
  });

  it('should not return soft-deleted currencies', async () => {
    await runQuery(db, "INSERT INTO currencies (currency_name, currency_create_date, currency_is_deleted) VALUES (?, ?, ?)", ['JPY', Date.now(), 1]);
    const currencies = await currencyService.getAll(db);
    const jpy = currencies.find(c => c.currency_name === 'JPY');
    expect(jpy).toBeUndefined();
  });
});

describe('currencyService.getById', () => {
  it('should return a currency by id', async () => {
    const currency = await currencyService.getById(db, 1);
    expect(currency).toBeDefined();
    expect(currency.currency_name).toBe('USD');
  });

  it('should return null for non-existent currency', async () => {
    const currency = await currencyService.getById(db, 99999);
    expect(currency).toBeNull();
  });
});

describe('currencyService.create', () => {
  it('should create a currency', async () => {
    const result = await currencyService.create(db, { currency_name: 'CHF' });
    expect(result.lastID).toBeDefined();
  });
});

describe('currencyService.softDelete', () => {
  it('should soft delete a currency', async () => {
    const res = await currencyService.create(db, { currency_name: 'AUD' });
    const result = await currencyService.softDelete(db, res.lastID);
    expect(result.changes).toBe(1);
  });
});
