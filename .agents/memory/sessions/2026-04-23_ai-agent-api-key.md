# Session: Ollama API Key Support — 2026-04-23

## Goal
Complete Ollama API key integration so the AI Agent can connect to Ollama cloud (not just local instances).

## Changes Made

### Backend
- `backend/migrations/027_agent_settings.sql`: Added `agent_ollama_api_key` seed row (empty default)
- `backend/services/agentService.js`:
  - `SETTING_KEYS`: added `apiKey: 'agent_ollama_api_key'`
  - `getSettings()`: extended `Promise.all` to fetch 3rd key, returns `ollama_api_key`
  - `updateSettings()`: handles `ollama_api_key` via shared `upsert` helper
  - `getOllamaModels(ollamaUrl, apiKey='')`: sends `Authorization: Bearer` header when key provided
  - `callOllama(baseUrl, model, messages, tools, apiKey='')`: sends `Authorization: Bearer` header when key provided
  - `chat()`: destructures `ollama_api_key` from settings, passes to both `callOllama` call sites
- `backend/routes/agentRoutes.js`: `GET /models` now passes `settings.ollama_api_key` to `getOllamaModels`

### Frontend
- `frontend/src/pages/settings/index.jsx`:
  - `agentForm` state extended: `{ ollama_url, ollama_model, ollama_api_key: '' }`
  - Added password input field for API Key with helper text "Required for Ollama cloud; leave empty for local"

## Tests
All 12 existing agentRoutes tests continue to pass (service is mocked, no changes needed).
