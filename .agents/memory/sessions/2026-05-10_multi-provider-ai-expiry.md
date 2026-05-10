# Session: 2026-05-10 — Multi-provider AI, AI log timestamps, Login UX, User expiry date

## What was done

### Multi-provider AI assistant (superadmin only)
- Migration 033: seeded 7 `app_settings` rows for `agent_provider` (default `ollama`), `agent_claude_api_key`, `agent_claude_model` (default `claude-sonnet-4-6`), `agent_gemini_api_key`, `agent_gemini_model` (default `gemini-2.0-flash`), `agent_gpt_api_key`, `agent_gpt_model` (default `gpt-4o`)
- Migration 034: added `agent_nvidia_api_key` + `agent_nvidia_model` (default `minimaxai/minimax-m2.7`)
- Migration 035: added `agent_openrouter_api_key` + `agent_openrouter_model` (default `meta-llama/llama-3.3-70b-instruct`)
- `agentService.js` major rewrite:
  - `SETTING_KEYS` extended to 12 keys; `FIELD_TO_KEY` mapping for frontend fields
  - `parseToolSchema(tool)` shared Zod parser
  - `buildOllamaTools()`, `buildClaudeTools()`, `buildGeminiTools()` per-provider tool formats
  - `loadToolboxTools()` shared async helper
  - `callOllama()`, `callClaude()`, `callGemini()`, `callOpenAICompat(baseUrl, ...)` callers
  - `chatWithOllama()`, `chatWithClaude()`, `chatWithGemini()`, `chatWithOpenAICompat()` full loops
  - `chatWithGPT()` + `chatWithNvidia()` → delegate to `callOpenAICompat` with different base URLs
  - `chatWithOpenRouter()` → delegates to `callOpenAICompat('https://openrouter.ai/api/v1')`
  - `chat()` dispatches to correct provider based on `agent_provider` setting
- `agentRoutes.js`: `PUT /settings` strips proprietary fields when caller is not superadmin; `requestedAt`/`respondedAt` timestamps around chat call
- `settings/index.jsx`: provider picker grid (superadmin), conditional fields per provider; OpenRouter model is free-text input; admin sees Ollama fields only
- `agent/index.jsx`: fetches active provider on mount; footer shows `Powered by {provider name}`
- Gemma models removed (404 on Google AI v1beta — requires Vertex AI); GEMINI_MODELS list corrected with preview date suffixes for 2.5 models
- Tests: `agentService.test.js` + `agentRoutes.test.js` updated with provider settings and role-based stripping tests

### AI log timestamps (requested_at + responded_at)
- `auditDatabase.js`: `ai_token_logs` schema now includes `responded_at INTEGER`; `applyAuditColumnMigrations()` silently adds column to existing DBs
- `aiTokenLogService.js`: `logTokens()` accepts `requestedAt`/`respondedAt`; `getMessages()` returns `responded_at`
- `logs/index.jsx`: `formatDuration(sentAt, respondedAt)` → e.g. `"2.3s"` / `"850ms"`; `SessionMessages` shows sent/replied timestamps and amber duration badge
- Tests: `aiTokenLogService.test.js` — schema includes `responded_at`; 2 new tests for timestamp storage

### Login password visibility toggle
- `login/index.jsx`: `Eye`/`EyeOff` icons from lucide-react; `showPassword` state; password input type toggles; toggle button absolutely positioned inside input, `tabIndex={-1}`
- Resolved git merge conflict using HEAD (our) version

### User expiry date
- Migration 036: `ALTER TABLE users ADD COLUMN user_expire_date INTEGER`
- `userService.js`:
  - `getAllUsers` + `getById` SELECT now include `u.user_expire_date`
  - `create()`: stores `user_expire_date` only for active users (null for inactive)
  - `update()`: handles `user_expire_date` field; deactivating a user also clears `user_expire_date`
- `authService.js`: `login()` returns `{ expired: true }` when `Date.now() > user_expire_date`
- `authRoutes.js`: handles `{ expired: true }` → HTTP 401 `"Account has expired"` + audit log `auth.login_expired`
- `users/index.jsx`: date picker inside active-user section; `tsToDate`/`dateToTs` converters; cleared when toggling to inactive
- `users/detail.jsx`: expiry date shown in header metadata; red + "(expired)" label when past
- Tests: 5 new `userService` tests (create with expiry, inactive ignores expiry, update/clear, deactivate clears); 2 new `authService` tests (expired login, future expiry allows login)
- All 1028 backend tests passing

## Files modified
- backend/migrations/033_proprietary_models.sql (new)
- backend/migrations/034_nvidia_provider.sql (new)
- backend/migrations/035_openrouter_provider.sql (new)
- backend/migrations/036_user_expire_date.sql (new)
- backend/services/agentService.js
- backend/services/aiTokenLogService.js
- backend/services/userService.js
- backend/services/authService.js
- backend/config/auditDatabase.js
- backend/routes/agentRoutes.js
- backend/routes/authRoutes.js
- backend/tests/services/agentService.test.js
- backend/tests/routes/agentRoutes.test.js
- backend/tests/services/aiTokenLogService.test.js
- backend/tests/services/userService.test.js
- backend/tests/services/authService.test.js
- frontend/src/pages/settings/index.jsx
- frontend/src/pages/agent/index.jsx
- frontend/src/pages/login/index.jsx
- frontend/src/pages/users/index.jsx
- frontend/src/pages/users/detail.jsx
