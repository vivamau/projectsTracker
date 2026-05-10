const { getAll } = require('../config/database');

function extractSearchTerms(content) {
  const words = content.match(/\b[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ]{2,}\b/g) || [];
  return [...new Set(words.map(w => w.toLowerCase()))];
}

function buildLike(terms, column) {
  if (!terms.length) return { clause: '1=0', params: [] };
  const clauses = terms.map(() => `LOWER(${column}) LIKE ?`).join(' OR ');
  const params = terms.map(t => `%${t}%`);
  return { clause: clauses, params };
}

async function buildEntityContext(db, content) {
  const terms = extractSearchTerms(content);
  if (!terms.length) return '';

  const pLike = buildLike(terms, 'project_name');
  const uLike = buildLike(terms, "TRIM(user_name || ' ' || COALESCE(user_lastname,''))");
  const dLike = buildLike(terms, 'division_name');
  const iLike = buildLike(terms, 'initiative_name');
  const vLike = buildLike(terms, 'vendor_name');
  const cLike = buildLike(terms, 'short_name');

  const [projects, users, divisions, initiatives, vendors, countries] = await Promise.all([
    getAll(db, `SELECT id, project_name AS name FROM projects WHERE (project_is_deleted=0 OR project_is_deleted IS NULL) AND (${pLike.clause}) LIMIT 30`, pLike.params),
    getAll(db, `SELECT id, TRIM(user_name || ' ' || COALESCE(user_lastname,'')) AS name FROM users WHERE (user_is_deleted=0 OR user_is_deleted IS NULL) AND (${uLike.clause}) LIMIT 20`, uLike.params),
    getAll(db, `SELECT id, division_name AS name FROM divisions WHERE (division_is_deleted=0 OR division_is_deleted IS NULL) AND (${dLike.clause})`, dLike.params),
    getAll(db, `SELECT id, initiative_name AS name FROM initiatives WHERE (initiative_is_deleted=0 OR initiative_is_deleted IS NULL) AND (${iLike.clause})`, iLike.params),
    getAll(db, `SELECT id, vendor_name AS name FROM vendors WHERE (vendor_is_deleted=0 OR vendor_is_deleted IS NULL) AND (${vLike.clause}) LIMIT 15`, vLike.params),
    getAll(db, `SELECT UN_country_code AS code, short_name AS name FROM countries WHERE (${cLike.clause}) LIMIT 20`, cLike.params),
  ]);

  const lines = [
    projects.length    ? `PROJECTS:\n${projects.map(p => `  "${p.name}" id:${p.id} url:/projects/${p.id}`).join('\n')}` : null,
    users.length       ? `PEOPLE:\n${users.map(u => `  "${u.name}" id:${u.id} url:/users/${u.id}`).join('\n')}` : null,
    divisions.length   ? `DIVISIONS:\n${divisions.map(d => `  "${d.name}" id:${d.id} url:/divisions/${d.id}`).join('\n')}` : null,
    initiatives.length ? `INITIATIVES:\n${initiatives.map(i => `  "${i.name}" id:${i.id} url:/initiatives/${i.id}`).join('\n')}` : null,
    vendors.length     ? `VENDORS:\n${vendors.map(v => `  "${v.name}" id:${v.id} url:/vendors/${v.id}`).join('\n')}` : null,
    countries.length   ? `COUNTRIES:\n${countries.map(c => `  "${c.name}" code:${c.code} url:/countries/${c.code}`).join('\n')}` : null,
  ].filter(Boolean);

  return lines.join('\n\n');
}

function buildPrompt(entityContext, content) {
  const entitySection = entityContext
    ? `Available entities (only use these exact ids/urls):\n<entities>\n${entityContext}\n</entities>\n\n`
    : '';
  return `You analyze meeting notes and insert markdown links for entities from a project tracking system.

${entitySection}Note to process:
<content>
${content}
</content>

Rules:
1. Identify clear, unambiguous mentions of entities from the list above.
2. Replace each plain-text mention with a markdown link: [name](url) using the url provided.
3. Be precise — skip partial matches or ambiguous names.
4. Leave existing markdown links [...](...) completely unchanged.
5. If no entities match, return the content unchanged.

Return ONLY a JSON object with no code fences or explanation:
{"content":"<full updated note text>","entities":[{"type":"project","id":"1","label":"Name","url":"/projects/1"},...]}`;
}

async function callAI(settings, prompt) {
  const { agent_provider, claude_api_key, claude_model,
          ollama_url, ollama_model, ollama_api_key,
          gpt_api_key, gpt_model,
          gemini_api_key, gemini_model,
          openrouter_api_key, openrouter_model,
          nvidia_api_key, nvidia_model } = settings;

  if (agent_provider === 'claude' && claude_api_key) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': claude_api_key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: claude_model || 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        system: 'Return only valid JSON. No markdown fences, no explanation.',
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text().catch(() => '')}`);
    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  if (agent_provider === 'ollama') {
    const headers = { 'Content-Type': 'application/json' };
    if (ollama_api_key) headers['Authorization'] = `Bearer ${ollama_api_key}`;
    const res = await fetch(`${ollama_url}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: ollama_model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        think: false,
        options: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(180000),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    return data.message?.content || '';
  }

  if (agent_provider === 'gemini' && gemini_api_key) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${gemini_model || 'gemini-2.0-flash-lite'}:generateContent?key=${gemini_api_key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        system_instruction: { parts: [{ text: 'Return only valid JSON. No markdown fences, no explanation.' }] },
        generationConfig: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text().catch(() => '')}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  const providerMap = {
    gpt:        { base: 'https://api.openai.com/v1',           key: gpt_api_key,        model: gpt_model },
    openrouter: { base: 'https://openrouter.ai/api/v1',        key: openrouter_api_key, model: openrouter_model },
    nvidia:     { base: 'https://integrate.api.nvidia.com/v1', key: nvidia_api_key,     model: nvidia_model },
  };
  const cfg = providerMap[agent_provider];
  if (cfg && cfg.key) {
    const res = await fetch(`${cfg.base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: 'Return only valid JSON. No markdown fences, no explanation.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 8192,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error(`${agent_provider} error ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  throw new Error('No AI provider configured. Please configure one in Settings.');
}

function cleanResponse(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

async function extractEntities(db, content) {
  const agentService = require('./agentService');
  const [settings, entityContext] = await Promise.all([
    agentService.getSettings(db),
    buildEntityContext(db, content),
  ]);

  if (!entityContext) {
    return { content, entities: [] };
  }

  const prompt = buildPrompt(entityContext, content);
  const rawResponse = await callAI(settings, prompt);
  const responseText = cleanResponse(rawResponse);

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned an invalid response (no JSON found)');

  let result;
  try { result = JSON.parse(jsonMatch[0]); }
  catch { throw new Error('AI returned malformed JSON'); }

  return {
    content: typeof result.content === 'string' ? result.content : content,
    entities: Array.isArray(result.entities) ? result.entities : [],
  };
}

module.exports = { extractEntities };
