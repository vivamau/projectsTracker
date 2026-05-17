const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM  = 'aes-256-gcm';
const KEY_BYTES  = 32;
const KEY_HEX_LEN = KEY_BYTES * 2;

// All app_settings keys that are secrets and must live in the encrypted store
const SECRET_KEYS = [
  'agent_ollama_api_key',
  'agent_claude_api_key',
  'agent_gemini_api_key',
  'agent_gpt_api_key',
  'agent_nvidia_api_key',
  'agent_openrouter_api_key',
  'github_backup_token',
];

class SecretsStore {
  constructor(filePath, keyHex) {
    if (!keyHex || keyHex.length !== KEY_HEX_LEN) {
      throw new Error(`SECRETS_KEY must be ${KEY_HEX_LEN} hex characters (${KEY_BYTES} bytes)`);
    }
    this.filePath = filePath;
    this._key = Buffer.from(keyHex, 'hex');
  }

  _load() {
    if (!fs.existsSync(this.filePath)) return {};
    const envelope = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    const decipher = crypto.createDecipheriv(ALGORITHM, this._key, Buffer.from(envelope.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(envelope.authTag, 'hex'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(envelope.data, 'hex')),
      decipher.final(),
    ]);
    return JSON.parse(plain.toString('utf8'));
  }

  _save(data) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const iv      = crypto.randomBytes(12);
    const cipher  = crypto.createCipheriv(ALGORITHM, this._key, iv);
    const plain   = JSON.stringify(data);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    fs.writeFileSync(this.filePath, JSON.stringify({
      iv:      iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
      data:    encrypted.toString('hex'),
    }), 'utf8');
  }

  get(key)         { return this._load()[key] ?? null; }
  getAll()         { return this._load(); }

  set(key, value)  { const d = this._load(); d[key] = value; this._save(d); }

  setMany(entries) { const d = this._load(); Object.assign(d, entries); this._save(d); }

  delete(key)      { const d = this._load(); delete d[key]; this._save(d); }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _store = null;

function _resolveKey() {
  const existing = process.env.SECRETS_KEY;
  if (existing && existing.length === KEY_HEX_LEN) return existing;

  // dotenv may not have loaded .env from the right CWD — read directly from the canonical path
  const envPath = path.join(__dirname, '..', '.env');
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^SECRETS_KEY=(.+)$/m);
      if (match) {
        const candidate = match[1].trim();
        if (candidate.length === KEY_HEX_LEN) {
          process.env.SECRETS_KEY = candidate;
          return candidate;
        }
      }
    }
  } catch {
    // Non-fatal — fall through to key generation
  }

  const key = crypto.randomBytes(KEY_BYTES).toString('hex');
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      if (/^SECRETS_KEY=/m.test(content)) {
        fs.writeFileSync(envPath, content.replace(/^SECRETS_KEY=.*$/m, `SECRETS_KEY=${key}`));
      } else {
        fs.appendFileSync(envPath, `\nSECRETS_KEY=${key}\n`);
      }
    } else {
      fs.writeFileSync(envPath, `SECRETS_KEY=${key}\n`);
    }
  } catch {
    // .env may not be writable in production — operator must set SECRETS_KEY manually
  }
  process.env.SECRETS_KEY = key;
  console.warn('[SecretsStore] Generated a new SECRETS_KEY and saved it to .env. Keep it safe — changing it will make existing secrets unreadable.');
  return key;
}

function getStore() {
  if (_store) return _store;
  const key      = _resolveKey();
  const filePath = process.env.SECRETS_PATH || path.join(__dirname, '..', 'data', 'secrets.enc');
  _store = new SecretsStore(filePath, key);
  return _store;
}

function resetStore() { _store = null; }

// ── Startup migration ─────────────────────────────────────────────────────────

async function migrateFromDb(db) {
  const { getOne, runQuery } = require('../config/database');
  const store = getStore();
  let migrated = 0;
  for (const key of SECRET_KEYS) {
    try {
      const row = await getOne(db, 'SELECT setting_value FROM app_settings WHERE setting_key = ?', [key]);
      if (!row || !row.setting_value) continue;
      if (store.get(key)) continue; // Already in store — don't overwrite
      store.set(key, row.setting_value);
      await runQuery(db, 'UPDATE app_settings SET setting_value = ? WHERE setting_key = ?', ['', key]);
      migrated++;
    } catch {
      // Non-fatal
    }
  }
  if (migrated > 0) {
    console.log(`[SecretsStore] Migrated ${migrated} secret(s) from database to encrypted store.`);
  }
}

module.exports = { SecretsStore, getStore, resetStore, migrateFromDb, SECRET_KEYS };
