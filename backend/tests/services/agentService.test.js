const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const agentService = require('../../services/agentService');
const { looksLikeSql, extractSql, stripSqlFromResponse } = agentService;

let db;

beforeAll(async () => {
  db = await initTestDb();
  await seedTestDb(db);
  jest.clearAllMocks();
});

afterAll(async () => {
  await closeTestDb(db);
  jest.restoreAllMocks();
});

describe('looksLikeSql', () => {
  it('returns false for empty/null text', () => {
    expect(looksLikeSql('')).toBe(false);
    expect(looksLikeSql(null)).toBe(false);
  });

  it('detects SELECT at start of text', () => {
    expect(looksLikeSql('SELECT id FROM projects')).toBe(true);
  });

  it('detects SELECT embedded after explanatory text', () => {
    expect(looksLikeSql('Here is the query:\n\nSELECT id FROM projects')).toBe(true);
  });

  it('detects SQL inside fenced code block', () => {
    expect(looksLikeSql('Here is the query:\n```sql\nSELECT id FROM projects\n```')).toBe(true);
  });

  it('returns false for plain text without SQL', () => {
    expect(looksLikeSql('There are 5 active projects in the Engineering division.')).toBe(false);
  });

  it('detects WITH clause at start of line', () => {
    expect(looksLikeSql('Some text\n\nWITH cte AS (SELECT 1)')).toBe(true);
  });
});

describe('extractSql', () => {
  it('extracts SQL from a fenced code block', () => {
    const text = 'Here is the query:\n```sql\nSELECT id FROM projects;\n```\nDone.';
    expect(extractSql(text)).toBe('SELECT id FROM projects;');
  });

  it('extracts bare SELECT block from mixed text', () => {
    const text = 'To answer this:\n\nSELECT id FROM projects\nWHERE id = 1;\n\nI will run this now.';
    const sql = extractSql(text);
    expect(sql).toContain('SELECT id FROM projects');
    expect(sql).toContain('WHERE id = 1;');
  });

  it('returns trimmed text when no SELECT found', () => {
    const text = '  plain answer  ';
    expect(extractSql(text)).toBe('plain answer');
  });
});

describe('stripSqlFromResponse', () => {
  it('returns null/empty as-is', () => {
    expect(stripSqlFromResponse(null)).toBeNull();
    expect(stripSqlFromResponse('')).toBe('');
  });

  it('removes fenced SQL code blocks', () => {
    const text = 'The answer is:\n```sql\nSELECT * FROM projects;\n```\nDone.';
    expect(stripSqlFromResponse(text)).not.toContain('SELECT');
    expect(stripSqlFromResponse(text)).toContain('The answer is');
  });

  it('removes bare SELECT statements on their own lines', () => {
    const text = 'Here is the query:\n\nSELECT id FROM projects WHERE id = 1;\n\nResult: 5 projects.';
    const cleaned = stripSqlFromResponse(text);
    expect(cleaned).not.toContain('SELECT');
    expect(cleaned).toContain('Result: 5 projects');
  });

  it('leaves plain-language responses unchanged', () => {
    const text = 'There are 5 active projects in Engineering.';
    expect(stripSqlFromResponse(text)).toBe(text);
  });
});

describe('agentService.getSettings', () => {
  it('returns defaults when no settings are configured', async () => {
    const settings = await agentService.getSettings(db);
    expect(settings).toHaveProperty('ollama_url');
    expect(settings).toHaveProperty('ollama_model');
    expect(settings).toHaveProperty('ollama_api_key');
    expect(settings.ollama_url).toBe('http://localhost:11434');
    expect(settings.ollama_model).toBe('llama3.2');
    expect(settings.ollama_api_key).toBe('');
  });

  it('returns configured values when settings exist', async () => {
    await agentService.updateSettings(db, {
      ollama_url: 'http://myollama:11434',
      ollama_model: 'mistral',
      ollama_api_key: 'my-api-key',
    });
    const settings = await agentService.getSettings(db);
    expect(settings.ollama_url).toBe('http://myollama:11434');
    expect(settings.ollama_model).toBe('mistral');
    expect(settings.ollama_api_key).toBe('my-api-key');
  });
});

describe('agentService.updateSettings', () => {
  it('updates only the provided fields', async () => {
    await agentService.updateSettings(db, { ollama_url: 'http://new:11434' });
    const settings = await agentService.getSettings(db);
    expect(settings.ollama_url).toBe('http://new:11434');
    expect(settings.ollama_model).toBe('mistral');
  });

  it('handles undefined fields (no-op for those keys)', async () => {
    const before = await agentService.getSettings(db);
    await agentService.updateSettings(db, {});
    const after = await agentService.getSettings(db);
    expect(after.ollama_model).toBe(before.ollama_model);
  });
});

describe('agentService.getOllamaModels', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns models from Ollama API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3.2', size: 1000 }, { name: 'mistral', size: 2000 }] })
    });
    const models = await agentService.getOllamaModels('http://localhost:11434');
    expect(models.length).toBe(2);
    expect(models[0].name).toBe('llama3.2');
  });

  it('returns empty array when fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));
    const models = await agentService.getOllamaModels('http://localhost:11434');
    expect(models).toEqual([]);
  });

  it('returns empty array when response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    const models = await agentService.getOllamaModels('http://localhost:11434');
    expect(models).toEqual([]);
  });

  it('sends Authorization header when apiKey is provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] })
    });
    await agentService.getOllamaModels('http://localhost:11434', 'my-key');
    const callArgs = global.fetch.mock.calls[0];
    expect(callArgs[1].headers['Authorization']).toBe('Bearer my-key');
  });

  it('returns empty array when models field is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
    const models = await agentService.getOllamaModels('http://localhost:11434');
    expect(models).toEqual([]);
  });
});
