const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SecretsStore, getStore, resetStore, SECRET_KEYS } = require('../../services/secretsStore');

function randomKey() { return crypto.randomBytes(32).toString('hex'); }
function tmpFile()   { return path.join(os.tmpdir(), `secrets_test_${crypto.randomBytes(6).toString('hex')}.enc`); }

afterEach(() => {
  resetStore();
  delete process.env.SECRETS_KEY;
  delete process.env.SECRETS_PATH;
});

// ── SecretsStore class ────────────────────────────────────────────────────────

describe('SecretsStore constructor', () => {
  it('throws if key is wrong length', () => {
    expect(() => new SecretsStore('/tmp/x.enc', 'short')).toThrow('SECRETS_KEY');
  });

  it('throws if key is empty', () => {
    expect(() => new SecretsStore('/tmp/x.enc', '')).toThrow('SECRETS_KEY');
  });

  it('constructs with valid 64-char hex key', () => {
    expect(() => new SecretsStore('/tmp/x.enc', randomKey())).not.toThrow();
  });
});

describe('SecretsStore.get / set', () => {
  it('returns null for unknown key', () => {
    const store = new SecretsStore(tmpFile(), randomKey());
    expect(store.get('missing')).toBeNull();
  });

  it('stores and retrieves a value', () => {
    const store = new SecretsStore(tmpFile(), randomKey());
    store.set('token', 'ghp_abc123');
    expect(store.get('token')).toBe('ghp_abc123');
  });

  it('overwrites an existing value', () => {
    const store = new SecretsStore(tmpFile(), randomKey());
    store.set('key', 'v1');
    store.set('key', 'v2');
    expect(store.get('key')).toBe('v2');
  });

  it('stores multiple independent keys', () => {
    const store = new SecretsStore(tmpFile(), randomKey());
    store.set('a', '1');
    store.set('b', '2');
    expect(store.get('a')).toBe('1');
    expect(store.get('b')).toBe('2');
  });
});

describe('SecretsStore.setMany', () => {
  it('stores multiple entries atomically', () => {
    const store = new SecretsStore(tmpFile(), randomKey());
    store.setMany({ x: 'X', y: 'Y' });
    expect(store.get('x')).toBe('X');
    expect(store.get('y')).toBe('Y');
  });

  it('merges with existing entries', () => {
    const store = new SecretsStore(tmpFile(), randomKey());
    store.set('existing', 'keep');
    store.setMany({ new_key: 'new_val' });
    expect(store.get('existing')).toBe('keep');
    expect(store.get('new_key')).toBe('new_val');
  });
});

describe('SecretsStore.getAll', () => {
  it('returns empty object when file absent', () => {
    const store = new SecretsStore(tmpFile(), randomKey());
    expect(store.getAll()).toEqual({});
  });

  it('returns all stored entries', () => {
    const store = new SecretsStore(tmpFile(), randomKey());
    store.set('a', '1');
    store.set('b', '2');
    expect(store.getAll()).toEqual({ a: '1', b: '2' });
  });
});

describe('SecretsStore.delete', () => {
  it('removes a key', () => {
    const store = new SecretsStore(tmpFile(), randomKey());
    store.set('del', 'val');
    store.delete('del');
    expect(store.get('del')).toBeNull();
  });

  it('is a no-op for a missing key', () => {
    const store = new SecretsStore(tmpFile(), randomKey());
    expect(() => store.delete('ghost')).not.toThrow();
  });
});

describe('SecretsStore encryption integrity', () => {
  it('different stores with same key+file share data', () => {
    const file = tmpFile();
    const key  = randomKey();
    const s1 = new SecretsStore(file, key);
    s1.set('shared', 'hello');
    const s2 = new SecretsStore(file, key);
    expect(s2.get('shared')).toBe('hello');
  });

  it('cannot decrypt with a different key', () => {
    const file = tmpFile();
    const s1 = new SecretsStore(file, randomKey());
    s1.set('x', 'secret');
    const s2 = new SecretsStore(file, randomKey()); // different key
    expect(() => s2.get('x')).toThrow();
  });

  it('file content is not plaintext', () => {
    const file = tmpFile();
    const store = new SecretsStore(file, randomKey());
    store.set('password', 'supersecret');
    const raw = fs.readFileSync(file, 'utf8');
    expect(raw).not.toContain('supersecret');
    expect(raw).not.toContain('password');
  });

  it('produces different ciphertext on each write (random IV)', () => {
    const file = tmpFile();
    const key  = randomKey();
    const s1 = new SecretsStore(file, key);
    s1.set('k', 'v');
    const enc1 = fs.readFileSync(file, 'utf8');
    s1.set('k', 'v'); // same value
    const enc2 = fs.readFileSync(file, 'utf8');
    expect(enc1).not.toBe(enc2); // different IVs
  });
});

// ── getStore singleton ────────────────────────────────────────────────────────

describe('getStore', () => {
  it('returns a SecretsStore instance', () => {
    process.env.SECRETS_KEY = randomKey();
    process.env.SECRETS_PATH = tmpFile();
    const store = getStore();
    expect(store).toBeInstanceOf(SecretsStore);
  });

  it('returns the same instance on repeated calls', () => {
    process.env.SECRETS_KEY = randomKey();
    process.env.SECRETS_PATH = tmpFile();
    expect(getStore()).toBe(getStore());
  });

  it('returns a new instance after resetStore', () => {
    process.env.SECRETS_KEY = randomKey();
    process.env.SECRETS_PATH = tmpFile();
    const s1 = getStore();
    resetStore();
    process.env.SECRETS_KEY = randomKey();
    process.env.SECRETS_PATH = tmpFile();
    const s2 = getStore();
    expect(s1).not.toBe(s2);
  });
});

// ── _resolveKey fallback: reads from backend/.env ────────────────────────────

describe('_resolveKey: reads SECRETS_KEY from backend/.env when env var absent', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  it('reads key from .env when process.env.SECRETS_KEY is not set', () => {
    const expectedKey = randomKey();
    const mockEnvContent = `PORT=5000\nSECRETS_KEY=${expectedKey}\n`;

    jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
      if (String(p).endsWith('.env')) return true;
      return false; // secrets.enc absent — fresh store
    });
    jest.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (String(p).endsWith('.env')) return mockEnvContent;
      return '{}'; // fallback
    });

    process.env.SECRETS_PATH = tmpFile();
    // SECRETS_KEY deliberately not set

    const store = getStore();
    expect(store).toBeInstanceOf(SecretsStore);
    expect(process.env.SECRETS_KEY).toBe(expectedKey);
  });

  it('generates a new key when .env has no SECRETS_KEY entry', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'appendFileSync').mockImplementation(() => {});

    process.env.SECRETS_PATH = tmpFile();
    // SECRETS_KEY deliberately not set

    const store = getStore();
    expect(store).toBeInstanceOf(SecretsStore);
    expect(process.env.SECRETS_KEY).toHaveLength(64);
  });
});

// ── SECRET_KEYS constant ──────────────────────────────────────────────────────

describe('SECRET_KEYS', () => {
  it('includes all expected agent API key names', () => {
    expect(SECRET_KEYS).toContain('agent_claude_api_key');
    expect(SECRET_KEYS).toContain('agent_gemini_api_key');
    expect(SECRET_KEYS).toContain('agent_gpt_api_key');
    expect(SECRET_KEYS).toContain('agent_nvidia_api_key');
    expect(SECRET_KEYS).toContain('agent_openrouter_api_key');
    expect(SECRET_KEYS).toContain('agent_ollama_api_key');
  });

  it('includes github_backup_token', () => {
    expect(SECRET_KEYS).toContain('github_backup_token');
  });
});

// ── migrateFromDb ─────────────────────────────────────────────────────────────

describe('migrateFromDb', () => {
  const { initTestDb, closeTestDb } = require('../helpers/testDb');
  const appSettingsService = require('../../services/appSettingsService');
  const { migrateFromDb } = require('../../services/secretsStore');

  let db;
  beforeAll(async () => { db = await initTestDb(); });
  afterAll(async () => { await closeTestDb(db); });

  beforeEach(() => {
    resetStore();
    process.env.SECRETS_KEY = randomKey();
    process.env.SECRETS_PATH = tmpFile();
  });

  it('moves a non-empty secret from DB to store and clears it in DB', async () => {
    await appSettingsService.set(db, 'agent_claude_api_key', 'sk-secret', 'admin@test.com');
    await migrateFromDb(db);
    const store = getStore();
    expect(store.get('agent_claude_api_key')).toBe('sk-secret');
    const dbValue = await appSettingsService.get(db, 'agent_claude_api_key');
    expect(dbValue).toBe('');
  });

  it('does not overwrite an existing store value', async () => {
    const store = getStore();
    store.set('agent_gpt_api_key', 'already-in-store');
    await appSettingsService.set(db, 'agent_gpt_api_key', 'from-db', 'admin@test.com');
    await migrateFromDb(db);
    expect(store.get('agent_gpt_api_key')).toBe('already-in-store');
  });

  it('skips keys with empty DB values', async () => {
    await appSettingsService.set(db, 'agent_gemini_api_key', '', 'admin@test.com');
    await migrateFromDb(db);
    expect(getStore().get('agent_gemini_api_key')).toBeNull();
  });

  it('is idempotent when run twice', async () => {
    await appSettingsService.set(db, 'github_backup_token', 'ghp_tok', 'admin@test.com');
    await migrateFromDb(db);
    await migrateFromDb(db); // second run should be a no-op
    expect(getStore().get('github_backup_token')).toBe('ghp_tok');
  });
});
