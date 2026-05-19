const { getOne, runQuery } = require('../config/database');
const { getStore } = require('./secretsStore');
const ragService = require('./ragService');

const SETTING_KEYS = {
  url:           'agent_ollama_url',
  model:         'agent_ollama_model',
  apiKey:        'agent_ollama_api_key',
  provider:      'agent_provider',
  claudeApiKey:  'agent_claude_api_key',
  claudeModel:   'agent_claude_model',
  geminiApiKey:  'agent_gemini_api_key',
  geminiModel:   'agent_gemini_model',
  gptApiKey:     'agent_gpt_api_key',
  gptModel:      'agent_gpt_model',
  nvidiaApiKey:       'agent_nvidia_api_key',
  nvidiaModel:        'agent_nvidia_model',
  openrouterApiKey:   'agent_openrouter_api_key',
  openrouterModel:    'agent_openrouter_model',
  llamacppUrl:        'agent_llamacpp_url',
  llamacppModel:      'agent_llamacpp_model',
  llamacppApiKey:     'agent_llamacpp_api_key',
};

const FIELD_TO_KEY = {
  ollama_url:      SETTING_KEYS.url,
  ollama_model:    SETTING_KEYS.model,
  ollama_api_key:  SETTING_KEYS.apiKey,
  agent_provider:  SETTING_KEYS.provider,
  claude_api_key:  SETTING_KEYS.claudeApiKey,
  claude_model:    SETTING_KEYS.claudeModel,
  gemini_api_key:  SETTING_KEYS.geminiApiKey,
  gemini_model:    SETTING_KEYS.geminiModel,
  gpt_api_key:     SETTING_KEYS.gptApiKey,
  gpt_model:       SETTING_KEYS.gptModel,
  nvidia_api_key:       SETTING_KEYS.nvidiaApiKey,
  nvidia_model:         SETTING_KEYS.nvidiaModel,
  openrouter_api_key:   SETTING_KEYS.openrouterApiKey,
  openrouter_model:     SETTING_KEYS.openrouterModel,
  llamacpp_url:         SETTING_KEYS.llamacppUrl,
  llamacpp_model:       SETTING_KEYS.llamacppModel,
  llamacpp_api_key:     SETTING_KEYS.llamacppApiKey,
};

// These setting keys hold secrets — stored in the encrypted file, not the DB
const SECRET_DB_KEYS = new Set([
  SETTING_KEYS.apiKey,
  SETTING_KEYS.claudeApiKey,
  SETTING_KEYS.geminiApiKey,
  SETTING_KEYS.gptApiKey,
  SETTING_KEYS.nvidiaApiKey,
  SETTING_KEYS.openrouterApiKey,
  SETTING_KEYS.llamacppApiKey,
]);

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
- NEVER include SQL statements, code blocks, or query syntax in your text responses
- Do NOT explain what query you are about to run — just run it using the tool
- After receiving tool results, respond ONLY with a human-readable answer in plain language
- Be concise and format numbers clearly
- When listing items, use clean formatting
- If a query fails, explain what went wrong and try a simpler approach`;

// ── Settings ──────────────────────────────────────────────────────────────────

async function getSettings(db) {
  const store = getStore();
  const nonSecretKeys = Object.values(SETTING_KEYS).filter(k => !SECRET_DB_KEYS.has(k));
  const pairs = await Promise.all(
    nonSecretKeys.map(k =>
      getOne(db, 'SELECT setting_value FROM app_settings WHERE setting_key = ?', [k])
        .then(r => [k, r?.setting_value])
    )
  );
  const m = Object.fromEntries(pairs);
  return {
    ollama_url:     m[SETTING_KEYS.url]          || 'http://localhost:11434',
    ollama_model:   m[SETTING_KEYS.model]        || 'llama3.2',
    ollama_api_key: store.get(SETTING_KEYS.apiKey)          || '',
    agent_provider: m[SETTING_KEYS.provider]     || 'ollama',
    claude_api_key: store.get(SETTING_KEYS.claudeApiKey)    || '',
    claude_model:   m[SETTING_KEYS.claudeModel]  || 'claude-sonnet-4-6',
    gemini_api_key: store.get(SETTING_KEYS.geminiApiKey)    || '',
    gemini_model:   m[SETTING_KEYS.geminiModel]  || 'gemini-2.0-flash',
    gpt_api_key:    store.get(SETTING_KEYS.gptApiKey)       || '',
    gpt_model:      m[SETTING_KEYS.gptModel]     || 'gpt-4o',
    nvidia_api_key:       store.get(SETTING_KEYS.nvidiaApiKey)      || '',
    nvidia_model:         m[SETTING_KEYS.nvidiaModel]               || 'minimaxai/minimax-m2.7',
    openrouter_api_key:   store.get(SETTING_KEYS.openrouterApiKey)  || '',
    openrouter_model:     m[SETTING_KEYS.openrouterModel]           || 'meta-llama/llama-3.3-70b-instruct',
    llamacpp_url:         m[SETTING_KEYS.llamacppUrl]               || 'http://localhost:8080',
    llamacpp_model:       m[SETTING_KEYS.llamacppModel]             || '',
    llamacpp_api_key:     store.get(SETTING_KEYS.llamacppApiKey)    || '',
  };
}

async function updateSettings(db, data) {
  const store = getStore();
  const now = Date.now();
  const upsert = (key, value) => runQuery(db,
    `INSERT INTO app_settings (setting_key, setting_value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at`,
    [key, value, now]
  );
  for (const [field, key] of Object.entries(FIELD_TO_KEY)) {
    if (data[field] === undefined) continue;
    if (SECRET_DB_KEYS.has(key)) {
      store.set(key, data[field]);
    } else {
      await upsert(key, data[field]);
    }
  }
}

// ── Ollama ────────────────────────────────────────────────────────────────────

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

// ── llama.cpp ─────────────────────────────────────────────────────────────────

async function getLlamaCppModels(llamaCppUrl, apiKey = '') {
  try {
    const base = (llamaCppUrl || '').replace(/\/+$/, '');
    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    const res = await fetch(`${base}/v1/models`, { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map(m => ({ name: m.id }));
  } catch {
    return [];
  }
}

// ── Tool schema helpers ───────────────────────────────────────────────────────

function parseToolSchema(tool) {
  const shape = tool.params?._def?.shape?.() || {};
  const properties = {};
  const required = [];
  for (const [name, field] of Object.entries(shape)) {
    let def = field._def;
    let optional = false;
    if (def?.typeName === 'ZodOptional') { optional = true; def = def.innerType?._def; }
    const typeMap = { ZodString: 'string', ZodNumber: 'number', ZodBoolean: 'boolean', ZodArray: 'array' };
    properties[name] = { type: typeMap[def?.typeName] || 'string' };
    if (!optional) required.push(name);
  }
  return { name: tool.toolName, description: tool.description, properties, required };
}

function buildOllamaTools(toolboxTools) {
  return toolboxTools.map(tool => {
    const { name, description, properties, required } = parseToolSchema(tool);
    return {
      type: 'function',
      function: { name, description, parameters: { type: 'object', properties, ...(required.length ? { required } : {}) } },
    };
  });
}

function buildClaudeTools(toolboxTools) {
  return toolboxTools.map(tool => {
    const { name, description, properties, required } = parseToolSchema(tool);
    return {
      name,
      description,
      input_schema: { type: 'object', properties, ...(required.length ? { required } : {}) },
    };
  });
}

function buildGeminiTools(toolboxTools) {
  const geminiTypeMap = { string: 'STRING', number: 'NUMBER', boolean: 'BOOLEAN', array: 'ARRAY' };
  const function_declarations = toolboxTools.map(tool => {
    const { name, description, properties, required } = parseToolSchema(tool);
    const geminiProps = Object.fromEntries(
      Object.entries(properties).map(([k, v]) => [k, { type: geminiTypeMap[v.type] || 'STRING' }])
    );
    return { name, description, parameters: { type: 'OBJECT', properties: geminiProps, ...(required.length ? { required } : {}) } };
  });
  return [{ function_declarations }];
}

// ── Toolbox loader ────────────────────────────────────────────────────────────

async function loadToolboxTools() {
  try {
    const { ToolboxClient } = require('@toolbox-sdk/core');
    const client = new ToolboxClient(TOOLBOX_URL);
    return await client.loadToolset();
  } catch {
    return [];
  }
}

// ── SQL helpers ───────────────────────────────────────────────────────────────

function looksLikeSql(text) {
  if (!text) return false;
  const stripped = text.replace(/```[\w]*\n?/g, '').trim();
  return /(?:^|\n)\s*(SELECT\b|WITH\s+\w)/im.test(stripped);
}

function extractSql(text) {
  const fenced = text.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  const lines = text.split('\n');
  const sqlLines = [];
  let inSql = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inSql && /^(SELECT|WITH\s+\w)\b/i.test(trimmed)) inSql = true;
    if (inSql) {
      sqlLines.push(line);
      if (trimmed.endsWith(';')) break;
    }
  }
  return sqlLines.length > 0 ? sqlLines.join('\n').trim() : text.trim();
}

function extractInlineToolCall(text) {
  if (!text || typeof text !== 'string') return null;
  // Try fenced JSON blocks first
  const fenceMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  const candidates = [];
  if (fenceMatch) candidates.push(fenceMatch[1]);
  // Then scan for any balanced top-level JSON objects mentioning "name"
  const nameIdx = text.indexOf('"name"');
  if (nameIdx >= 0) {
    // Walk backward to find the opening brace, forward to find the matching close
    let start = text.lastIndexOf('{', nameIdx);
    while (start !== -1) {
      let depth = 0;
      for (let i = start; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') {
          depth--;
          if (depth === 0) { candidates.push(text.slice(start, i + 1)); break; }
        }
      }
      // also try the previous { in case the first attempt fails
      start = text.lastIndexOf('{', start - 1);
      if (candidates.length > 0) break;
    }
  }
  for (const raw of candidates) {
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj.name === 'string') {
        const args = obj.parameters ?? obj.arguments ?? obj.input ?? {};
        return { name: obj.name, args, raw };
      }
    } catch { /* try next */ }
  }
  return null;
}

function stripInlineToolCallJson(text) {
  if (!text) return text;
  // strip fenced JSON blocks that look like a tool call
  let cleaned = text.replace(/```(?:json)?\s*\{[\s\S]*?"name"[\s\S]*?\}\s*```/gi, '');
  // strip unfenced top-level {"name":..., "(parameters|arguments|input)":...} objects
  cleaned = cleaned.replace(/\{[^{}]*"name"\s*:\s*"[^"]+"[^{}]*"(?:parameters|arguments|input)"\s*:\s*\{[^{}]*\}[^{}]*\}/g, '');
  return cleaned;
}

function stripSqlFromResponse(text) {
  if (!text) return text;
  let cleaned = text.replace(/```(?:sql)?\s*([\s\S]*?)```/gi, '');
  cleaned = cleaned.replace(/^[ \t]*(SELECT|WITH)\b[\s\S]*?;[ \t]*$/gim, '');
  cleaned = stripInlineToolCallJson(cleaned);
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

async function runQueryDirectly(db, sql) {
  const { getAll } = require('../config/database');
  const cleanSql = sql.trim().replace(/;+$/, '');
  if (!/^\s*SELECT\b/i.test(cleanSql)) throw new Error('Only SELECT queries are permitted');
  const rows = await getAll(db, cleanSql, []);
  return JSON.stringify(rows, null, 2);
}

// ── Inline tool-call rescue (for local models that emit JSON as text) ────────

async function executeInlineToolCall(inline, toolboxTools, db, trace) {
  if (inline.name === 'execute_sql' && inline.args && inline.args.sql) {
    trace.push({ type: 'sql' });
    try { return await runQueryDirectly(db, inline.args.sql); }
    catch (e) { return `Error: ${e.message}`; }
  }
  const tool = (toolboxTools || []).find(t => t.toolName === inline.name);
  if (!tool) return null; // unknown — let the response pass through
  trace.push({ type: 'tool', name: inline.name });
  try {
    const raw = await tool(inline.args || {});
    return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
  } catch (e) { return `Error: ${e.message}`; }
}

// ── Ollama chat ───────────────────────────────────────────────────────────────

async function callOllama(baseUrl, model, messages, tools, apiKey = '') {
  const body = { model, messages, stream: false };
  if (tools && tools.length > 0) body.tools = tools;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }
  return res.json();
}

async function chatWithOllama(settings, { message, history, db, trace = [], useMcp = true }) {
  const { ollama_url, ollama_model, ollama_api_key } = settings;
  const toolboxTools = useMcp ? await loadToolboxTools() : [];
  const ollamaTools = useMcp ? buildOllamaTools(toolboxTools) : [];

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message }];
  let totalPromptTokens = 0, totalCompletionTokens = 0;

  for (let i = 0; i < 8; i++) {
    const response = await callOllama(ollama_url, ollama_model, messages, ollamaTools, ollama_api_key);
    totalPromptTokens     += response.prompt_eval_count || 0;
    totalCompletionTokens += response.eval_count        || 0;
    const assistantMsg = response.message;

    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      if (useMcp && looksLikeSql(assistantMsg.content)) {
        const sql = extractSql(assistantMsg.content);
        let queryResult;
        try { queryResult = await runQueryDirectly(db, sql); }
        catch (err) { queryResult = `Error running query: ${err.message}`; }
        trace.push({ type: 'sql' });
        messages.push({ role: 'assistant', content: assistantMsg.content });
        messages.push({ role: 'tool', content: queryResult });
        messages.push({ role: 'user', content: 'Please summarise these query results in plain language. Do not show any SQL.' });
        continue;
      }
      if (useMcp) {
        const inline = extractInlineToolCall(assistantMsg.content);
        if (inline) {
          const result = await executeInlineToolCall(inline, toolboxTools, db, trace);
          if (result !== null) {
            messages.push({ role: 'assistant', content: assistantMsg.content });
            messages.push({ role: 'tool', content: result });
            messages.push({ role: 'user', content: 'Please summarise these tool results in plain language. Do not include any tool-call JSON.' });
            continue;
          }
        }
      }
      return { role: 'assistant', content: stripSqlFromResponse(assistantMsg.content), model: ollama_model, promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens };
    }

    if (!useMcp) {
      // MCP disabled — ignore any tool_calls the model attempted; surface text only
      return { role: 'assistant', content: stripSqlFromResponse(assistantMsg.content || ''), model: ollama_model, promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens };
    }

    messages.push(assistantMsg);
    for (const toolCall of assistantMsg.tool_calls) {
      trace.push({ type: 'tool', name: toolCall.function.name });
      const tool = toolboxTools.find(t => t.toolName === toolCall.function.name);
      let result;
      try {
        if (!tool) throw new Error(`Tool '${toolCall.function.name}' not found`);
        const raw = await tool(toolCall.function.arguments || {});
        result = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
      } catch (err) { result = `Error: ${err.message}`; }
      messages.push({ role: 'tool', content: result });
    }
  }

  const final = await callOllama(ollama_url, ollama_model, messages, [], ollama_api_key);
  totalPromptTokens     += final.prompt_eval_count || 0;
  totalCompletionTokens += final.eval_count        || 0;
  return { role: 'assistant', content: stripSqlFromResponse(final.message.content), model: ollama_model, promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens };
}

// ── Claude chat ───────────────────────────────────────────────────────────────

async function callClaude(model, system, messages, tools, apiKey) {
  const body = { model, max_tokens: 4096, system, messages };
  if (tools && tools.length > 0) body.tools = tools;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Claude error ${res.status}: ${text}`);
  }
  return res.json();
}

async function chatWithClaude(settings, { message, history, db, trace = [], useMcp = true }) {
  const { claude_api_key, claude_model } = settings;
  const toolboxTools = useMcp ? await loadToolboxTools() : [];
  const claudeTools = useMcp ? buildClaudeTools(toolboxTools) : [];

  const claudeMessages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];
  let totalInput = 0, totalOutput = 0;

  for (let i = 0; i < 8; i++) {
    const response = await callClaude(claude_model, SYSTEM_PROMPT, claudeMessages, claudeTools, claude_api_key);
    totalInput  += response.usage?.input_tokens  || 0;
    totalOutput += response.usage?.output_tokens || 0;

    const content = response.content || [];
    const textBlock  = content.find(b => b.type === 'text');
    const toolBlocks = content.filter(b => b.type === 'tool_use');

    if (toolBlocks.length === 0) {
      const text = textBlock?.text || '';
      if (useMcp && looksLikeSql(text)) {
        const sql = extractSql(text);
        let queryResult;
        try { queryResult = await runQueryDirectly(db, sql); }
        catch (err) { queryResult = `Error: ${err.message}`; }
        trace.push({ type: 'sql' });
        claudeMessages.push({ role: 'assistant', content });
        claudeMessages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'inline', content: queryResult }] });
        claudeMessages.push({ role: 'user', content: 'Please summarise these query results in plain language. Do not show any SQL.' });
        continue;
      }
      return { role: 'assistant', content: stripSqlFromResponse(text), model: claude_model, promptTokens: totalInput, completionTokens: totalOutput };
    }

    if (!useMcp) {
      const text = textBlock?.text || '';
      return { role: 'assistant', content: stripSqlFromResponse(text), model: claude_model, promptTokens: totalInput, completionTokens: totalOutput };
    }

    claudeMessages.push({ role: 'assistant', content });
    const toolResults = [];
    for (const block of toolBlocks) {
      trace.push({ type: 'tool', name: block.name });
      const tool = toolboxTools.find(t => t.toolName === block.name);
      let result;
      try {
        if (!tool) throw new Error(`Tool '${block.name}' not found`);
        const raw = await tool(block.input || {});
        result = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
      } catch (err) { result = `Error: ${err.message}`; }
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
    }
    claudeMessages.push({ role: 'user', content: toolResults });
  }

  const final = await callClaude(claude_model, SYSTEM_PROMPT, claudeMessages, [], claude_api_key);
  totalInput  += final.usage?.input_tokens  || 0;
  totalOutput += final.usage?.output_tokens || 0;
  const finalText = (final.content || []).find(b => b.type === 'text')?.text || '';
  return { role: 'assistant', content: stripSqlFromResponse(finalText), model: claude_model, promptTokens: totalInput, completionTokens: totalOutput };
}

// ── Gemini chat ───────────────────────────────────────────────────────────────

async function callGemini(model, system, contents, tools, apiKey) {
  const body = { contents, system_instruction: { parts: [{ text: system }] } };
  if (tools && tools.length > 0) body.tools = tools;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini error ${res.status}: ${text}`);
  }
  return res.json();
}

async function chatWithGemini(settings, { message, history, db, trace = [], useMcp = true }) {
  const { gemini_api_key, gemini_model } = settings;
  const toolboxTools = useMcp ? await loadToolboxTools() : [];
  const geminiTools = useMcp ? buildGeminiTools(toolboxTools) : [];

  const contents = [
    ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: message }] },
  ];
  let totalPrompt = 0, totalOutput = 0;

  for (let i = 0; i < 8; i++) {
    const response = await callGemini(gemini_model, SYSTEM_PROMPT, contents, geminiTools, gemini_api_key);
    totalPrompt += response.usageMetadata?.promptTokenCount      || 0;
    totalOutput += response.usageMetadata?.candidatesTokenCount  || 0;

    const parts    = response.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find(p => p.text !== undefined);
    const fnCalls  = parts.filter(p => p.functionCall);

    if (fnCalls.length === 0) {
      const text = textPart?.text || '';
      if (useMcp && looksLikeSql(text)) {
        const sql = extractSql(text);
        let queryResult;
        try { queryResult = await runQueryDirectly(db, sql); }
        catch (err) { queryResult = `Error: ${err.message}`; }
        trace.push({ type: 'sql' });
        contents.push({ role: 'model', parts });
        contents.push({ role: 'user', parts: [{ functionResponse: { name: 'execute_sql', response: { result: queryResult } } }] });
        contents.push({ role: 'user', parts: [{ text: 'Please summarise these query results in plain language. Do not show any SQL.' }] });
        continue;
      }
      return { role: 'assistant', content: stripSqlFromResponse(text), model: gemini_model, promptTokens: totalPrompt, completionTokens: totalOutput };
    }

    if (!useMcp) {
      const text = textPart?.text || '';
      return { role: 'assistant', content: stripSqlFromResponse(text), model: gemini_model, promptTokens: totalPrompt, completionTokens: totalOutput };
    }

    contents.push({ role: 'model', parts });
    const fnResponses = [];
    for (const fnCall of fnCalls) {
      const toolName = fnCall.functionCall.name;
      trace.push({ type: 'tool', name: toolName });
      const tool = toolboxTools.find(t => t.toolName === toolName);
      let result;
      try {
        if (!tool) throw new Error(`Tool '${toolName}' not found`);
        const raw = await tool(fnCall.functionCall.args || {});
        result = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
      } catch (err) { result = `Error: ${err.message}`; }
      fnResponses.push({ functionResponse: { name: toolName, response: { result } } });
    }
    contents.push({ role: 'user', parts: fnResponses });
  }

  const final = await callGemini(gemini_model, SYSTEM_PROMPT, contents, [], gemini_api_key);
  totalPrompt += final.usageMetadata?.promptTokenCount     || 0;
  totalOutput += final.usageMetadata?.candidatesTokenCount || 0;
  const finalText = (final.candidates?.[0]?.content?.parts || []).find(p => p.text !== undefined)?.text || '';
  return { role: 'assistant', content: stripSqlFromResponse(finalText), model: gemini_model, promptTokens: totalPrompt, completionTokens: totalOutput };
}

// ── OpenAI-compatible chat (GPT, NVIDIA NIM, …) ───────────────────────────────

async function callOpenAICompat(baseUrl, model, messages, tools, apiKey) {
  const body = { model, messages };
  if (tools && tools.length > 0) body.tools = tools;
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

async function chatWithOpenAICompat(baseUrl, model, settings_key, { message, history, db, toolboxTools, trace = [], useMcp = true }) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message }];
  const tools = useMcp ? buildOllamaTools(toolboxTools) : []; // OpenAI-compatible tool format
  let totalPrompt = 0, totalCompletion = 0;

  for (let i = 0; i < 8; i++) {
    const response = await callOpenAICompat(baseUrl, model, messages, tools, settings_key);
    totalPrompt     += response.usage?.prompt_tokens     || 0;
    totalCompletion += response.usage?.completion_tokens || 0;
    const assistantMsg = response.choices[0].message;

    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      if (useMcp && looksLikeSql(assistantMsg.content)) {
        const sql = extractSql(assistantMsg.content);
        let queryResult;
        try { queryResult = await runQueryDirectly(db, sql); }
        catch (err) { queryResult = `Error: ${err.message}`; }
        trace.push({ type: 'sql' });
        messages.push({ role: 'assistant', content: assistantMsg.content });
        messages.push({ role: 'tool', tool_call_id: 'inline', content: queryResult });
        messages.push({ role: 'user', content: 'Please summarise these query results in plain language. Do not show any SQL.' });
        continue;
      }
      if (useMcp) {
        const inline = extractInlineToolCall(assistantMsg.content);
        if (inline) {
          const result = await executeInlineToolCall(inline, toolboxTools, db, trace);
          if (result !== null) {
            messages.push({ role: 'assistant', content: assistantMsg.content });
            messages.push({ role: 'tool', tool_call_id: 'inline', content: result });
            messages.push({ role: 'user', content: 'Please summarise these tool results in plain language. Do not include any tool-call JSON.' });
            continue;
          }
        }
      }
      return { role: 'assistant', content: stripSqlFromResponse(assistantMsg.content), model, promptTokens: totalPrompt, completionTokens: totalCompletion };
    }

    if (!useMcp) {
      return { role: 'assistant', content: stripSqlFromResponse(assistantMsg.content || ''), model, promptTokens: totalPrompt, completionTokens: totalCompletion };
    }

    messages.push(assistantMsg);
    for (const toolCall of assistantMsg.tool_calls) {
      const toolName = toolCall.function.name;
      trace.push({ type: 'tool', name: toolName });
      let toolArgs;
      try { toolArgs = typeof toolCall.function.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments; }
      catch { toolArgs = {}; }
      const tool = toolboxTools.find(t => t.toolName === toolName);
      let result;
      try {
        if (!tool) throw new Error(`Tool '${toolName}' not found`);
        const raw = await tool(toolArgs);
        result = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
      } catch (err) { result = `Error: ${err.message}`; }
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
    }
  }

  const final = await callOpenAICompat(baseUrl, model, messages, [], settings_key);
  totalPrompt     += final.usage?.prompt_tokens     || 0;
  totalCompletion += final.usage?.completion_tokens || 0;
  return { role: 'assistant', content: stripSqlFromResponse(final.choices[0].message.content), model, promptTokens: totalPrompt, completionTokens: totalCompletion };
}

async function chatWithGPT(settings, { message, history, db, trace = [], useMcp = true }) {
  const toolboxTools = useMcp ? await loadToolboxTools() : [];
  return chatWithOpenAICompat('https://api.openai.com/v1', settings.gpt_model, settings.gpt_api_key, { message, history, db, toolboxTools, trace, useMcp });
}

async function chatWithNvidia(settings, { message, history, db, trace = [], useMcp = true }) {
  const toolboxTools = useMcp ? await loadToolboxTools() : [];
  return chatWithOpenAICompat('https://integrate.api.nvidia.com/v1', settings.nvidia_model, settings.nvidia_api_key, { message, history, db, toolboxTools, trace, useMcp });
}

async function chatWithOpenRouter(settings, { message, history, db, trace = [], useMcp = true }) {
  const toolboxTools = useMcp ? await loadToolboxTools() : [];
  return chatWithOpenAICompat('https://openrouter.ai/api/v1', settings.openrouter_model, settings.openrouter_api_key, { message, history, db, toolboxTools, trace, useMcp });
}

async function chatWithLlamaCpp(settings, { message, history, db, trace = [], useMcp = true }) {
  const toolboxTools = useMcp ? await loadToolboxTools() : [];
  const base = (settings.llamacpp_url || '').replace(/\/+$/, '') + '/v1';
  return chatWithOpenAICompat(base, settings.llamacpp_model || 'default', settings.llamacpp_api_key, { message, history, db, toolboxTools, trace, useMcp });
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

function buildMeta(ragSources = [], trace = []) {
  const t = trace || [];
  const tools = [...new Set(t.filter(e => e.type === 'tool').map(e => e.name))];
  const sqlQueries = t.filter(e => e.type === 'sql').length;
  const src = ragSources || [];
  return {
    ragUsed: src.length > 0,
    ragSources: src.map(s => ({ source_type: s.source_type, source_ref: s.source_ref, score: s.score })),
    tools,
    sqlQueries,
  };
}

async function chat(db, { message, history = [], useRag = true, useMcp = true }) {
  const settings = await getSettings(db);

  let augmented = message;
  let ragSources = [];
  if (useRag) {
    try {
      const { context, sources } = await ragService.retrieveWithContext(db, message);
      if (context) { augmented = `${context}\n\nUser question: ${message}`; ragSources = sources; }
    } catch {
      augmented = message;
      ragSources = [];
    }
  }

  const trace = [];
  const opts = { message: augmented, history, db, trace, useMcp };
  let result;
  switch (settings.agent_provider) {
    case 'claude':      result = await chatWithClaude(settings, opts); break;
    case 'gemini':      result = await chatWithGemini(settings, opts); break;
    case 'gpt':         result = await chatWithGPT(settings, opts); break;
    case 'nvidia':      result = await chatWithNvidia(settings, opts); break;
    case 'openrouter':  result = await chatWithOpenRouter(settings, opts); break;
    case 'llamacpp':    result = await chatWithLlamaCpp(settings, opts); break;
    default:            result = await chatWithOllama(settings, opts); break;
  }
  return { ...result, meta: buildMeta(ragSources, trace) };
}

module.exports = { getSettings, updateSettings, getOllamaModels, getLlamaCppModels, chat, buildMeta, looksLikeSql, extractSql, stripSqlFromResponse, extractInlineToolCall };
