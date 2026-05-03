const { getOne, runQuery } = require('../config/database');

const SETTING_KEYS = {
  url: 'agent_ollama_url',
  model: 'agent_ollama_model',
  apiKey: 'agent_ollama_api_key',
};

const TOOLBOX_URL = process.env.TOOLBOX_URL || 'http://localhost:5100';

const SYSTEM_PROMPT = `You are a helpful data assistant for the ProjectsTracker application.
You can query the database to answer questions about projects, budgets, divisions, vendors, countries, and people.

Key tables:
- projects: id, project_name, project_description, project_start_date, project_end_date, division_id, user_id (owner), initiative_id, deliverypath_id
- divisions: id, division_name
- users: id, user_name, user_lastname, user_email, userrole_id
- budgets: id, budget_amount, currency_id, project_id, budget_create_date
- purchase_orders: id, budget_id, vendor_id, purchaseorder_description
- purchase_order_items: id, purchaseorder_id, purchaseorderitems_days, purchaseorderitems_discounted_rate, currency_id
- vendors: id, vendor_name, vendor_email
- countries: UN_country_code, short_name, ISO2, ISO3
- projects_to_countries: project_id, UN_country_code
- initiatives: id, initiative_name
- deliverypaths: id, deliverypath_name
- healthstatuses: id, project_id, healthstatus_value (1=At Risk, 2=Needs Attention, 3=On Track), healthstatus_create_date
- currencies: id, currency_name, currency_code

Rules:
- Only execute SELECT queries — never INSERT, UPDATE, DELETE, or DROP
- ALWAYS use the execute_sql tool to run queries — NEVER write SQL in your reply text
- After receiving tool results, respond ONLY with a human-readable answer in plain language
- Be concise and format numbers clearly
- When listing items, use clean formatting
- If a query fails, explain what went wrong and try a simpler approach`;

async function getSettings(db) {
  const [urlRow, modelRow, keyRow] = await Promise.all([
    getOne(db, 'SELECT setting_value FROM app_settings WHERE setting_key = ?', [SETTING_KEYS.url]),
    getOne(db, 'SELECT setting_value FROM app_settings WHERE setting_key = ?', [SETTING_KEYS.model]),
    getOne(db, 'SELECT setting_value FROM app_settings WHERE setting_key = ?', [SETTING_KEYS.apiKey]),
  ]);
  return {
    ollama_url: urlRow?.setting_value || 'http://localhost:11434',
    ollama_model: modelRow?.setting_value || 'llama3.2',
    ollama_api_key: keyRow?.setting_value || '',
  };
}

async function updateSettings(db, { ollama_url, ollama_model, ollama_api_key }) {
  const now = Date.now();
  const upsert = (key, value) => runQuery(db,
    `INSERT INTO app_settings (setting_key, setting_value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at`,
    [key, value, now]
  );
  if (ollama_url !== undefined) await upsert(SETTING_KEYS.url, ollama_url);
  if (ollama_model !== undefined) await upsert(SETTING_KEYS.model, ollama_model);
  if (ollama_api_key !== undefined) await upsert(SETTING_KEYS.apiKey, ollama_api_key);
}

async function getOllamaModels(ollamaUrl, apiKey = '') {
  try {
    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    const res = await fetch(`${ollamaUrl}/api/tags`, { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map(m => ({ name: m.name, size: m.size }));
  } catch {
    return [];
  }
}

function buildOllamaTools(toolboxTools) {
  return toolboxTools.map(tool => {
    const shape = tool.params?._def?.shape?.() || {};
    const properties = {};
    const required = [];

    for (const [name, field] of Object.entries(shape)) {
      let def = field._def;
      let optional = false;
      if (def?.typeName === 'ZodOptional') {
        optional = true;
        def = def.innerType?._def;
      }
      const typeMap = { ZodString: 'string', ZodNumber: 'number', ZodBoolean: 'boolean', ZodArray: 'array' };
      properties[name] = { type: typeMap[def?.typeName] || 'string' };
      if (!optional) required.push(name);
    }

    return {
      type: 'function',
      function: {
        name: tool.toolName,
        description: tool.description,
        parameters: { type: 'object', properties, ...(required.length ? { required } : {}) },
      },
    };
  });
}

async function callOllama(baseUrl, model, messages, tools, apiKey = '') {
  const body = { model, messages, stream: false };
  if (tools && tools.length > 0) body.tools = tools;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }
  return res.json();
}

function looksLikeSql(text) {
  if (!text) return false;
  const stripped = text.replace(/```[\w]*\n?/g, '').trim();
  return /^\s*(SELECT|WITH\s+\w)/i.test(stripped);
}

function extractSql(text) {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

async function runQueryDirectly(db, sql) {
  const { getAll } = require('../config/database');
  const cleanSql = sql.trim().replace(/;+$/, '');
  if (!/^\s*SELECT\b/i.test(cleanSql)) throw new Error('Only SELECT queries are permitted');
  const rows = await getAll(db, cleanSql, []);
  return JSON.stringify(rows, null, 2);
}

async function chat(db, { message, history = [] }) {
  const settings = await getSettings(db);
  const { ollama_url, ollama_model, ollama_api_key } = settings;

  // Load tools from MCP Toolbox
  let toolboxTools = [];
  let ollamaTools = [];
  try {
    const { ToolboxClient } = require('@toolbox-sdk/core');
    const client = new ToolboxClient(TOOLBOX_URL);
    toolboxTools = await client.loadToolset();
    ollamaTools = buildOllamaTools(toolboxTools);
  } catch {
    // Toolbox unavailable — proceed without tools
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message },
  ];

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  const MAX_ITERATIONS = 8;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await callOllama(ollama_url, ollama_model, messages, ollamaTools, ollama_api_key);
    totalPromptTokens     += response.prompt_eval_count || 0;
    totalCompletionTokens += response.eval_count        || 0;
    const assistantMsg = response.message;

    // No tool calls — check if the reply is raw SQL instead of a human answer
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      if (looksLikeSql(assistantMsg.content)) {
        // Execute the SQL the model returned as text, then ask for interpretation
        const sql = extractSql(assistantMsg.content);
        let queryResult;
        try {
          queryResult = await runQueryDirectly(db, sql);
        } catch (err) {
          queryResult = `Error running query: ${err.message}`;
        }
        messages.push({ role: 'assistant', content: assistantMsg.content });
        messages.push({ role: 'tool', content: queryResult });
        messages.push({
          role: 'user',
          content: 'Please summarise these query results in plain language. Do not show any SQL.',
        });
        continue;
      }

      return {
        role: 'assistant',
        content: assistantMsg.content,
        model: ollama_model,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
      };
    }

    messages.push(assistantMsg);

    for (const toolCall of assistantMsg.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = toolCall.function.arguments || {};
      const tool = toolboxTools.find(t => t.toolName === toolName);

      let result;
      try {
        if (!tool) throw new Error(`Tool '${toolName}' not found`);
        const raw = await tool(toolArgs);
        result = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
      } catch (err) {
        result = `Error: ${err.message}`;
      }

      messages.push({ role: 'tool', content: result });
    }
  }

  // Max iterations: get a final response with no tools
  const final = await callOllama(ollama_url, ollama_model, messages, [], ollama_api_key);
  totalPromptTokens     += final.prompt_eval_count || 0;
  totalCompletionTokens += final.eval_count        || 0;
  return {
    role: 'assistant',
    content: final.message.content,
    model: ollama_model,
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
  };
}

module.exports = { getSettings, updateSettings, getOllamaModels, chat };
