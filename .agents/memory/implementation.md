# Implementation Status

## Backend
- **47 test suites, 727 tests, all passing**
- Services: auth, user, project, division, country, currency, healthStatus, initiative, deliveryPath, completion, budget, purchaseOrder, purchaseOrderItem, focalPoint, vendor, vendorContract, vendorContractRole, vendorRoleRate, seniority, poitemConsumption, vendorResource (getByProjectId)
- 14 route files: auth, projects (includes health-statuses + completions + budgets + project-managers + vendor-resources), divisions (includes focal-points + projects + project-managers), budgets (includes purchase-orders + purchase-order items + item consumptions), users, countries, currencies, initiatives, deliveryPaths, vendors (includes contracts > roles > rates), seniorities
- 16 migrations: initial schema, auth+soft-delete, completions FK, projectmanagers FK, PM division FK, vendors, PO+items, PO soft delete, vendor soft delete, PO items soft delete, vendor contracts soft delete, seniorities, vendor rates update, milestones dates, supporting divisions, poitem_consumptions
- 3 seed scripts: userroles, users, dummy_data (divisions, initiatives, delivery paths, projects, health statuses, completions, budgets, country links, PM assignments, focal points, vendors with 10 vendors × 1-3 contracts × 2-4 roles × 2-3 rates, 11 seniorities, 2-5 resources per vendor)

## Frontend
- Login, Dashboard (KPI + health chart + recent projects)
- Projects: list, detail (milestones, budgets, PMs with division, health timeline, countries), create/edit form (PM with division dropdown per user)
- Divisions: list (links to detail), detail (projects table, focal points with add/remove, PMs grouped by user, total budget, metadata)
- Budgets: detail page with purchase orders table, create/edit PO modals with vendor dropdown
- Purchase Orders: inline items management via PoItemsModal (max-w-4xl) — nested modal for item CRUD (description, dates, days, discounted_rate, currency, vendorcontractrole_id, vendorrolerate_id, vendorresource_id). Days column shows balance (allocated) e.g. "1.5 (2)". BarChart3 button per item opens ConsumptionModal.
  - ConsumptionModal.jsx: PO item day consumption tracking — utilization bar (green <80%, yellow >=80%, red >100%), monthly consumption table, create/edit form (month locked on edit), delete confirm, days support half-days (step=0.5)
- Vendors: list page with CRUD, vendor information (name, email, phone, address, website)
  - ContractsModal.jsx: manage contracts per vendor (create/edit/delete, nested roles management)
  - ContractRolesModal.jsx: manage roles per contract (create/edit/delete, nested rates management)
  - RatesModal.jsx: manage rates per role (currency dropdown, seniority dropdown, rate amount, description)
- Initiatives, Delivery Paths, Users, Settings
- Shared components: Sidebar, Header, Card, Modal, ConfirmDialog, StatusBadge, Pagination, SearchInput, LoadingSpinner, ProtectedRoute, PieChart
- Custom pages: PoItemsModal.jsx (self-contained PO items management), ContractsModal.jsx, ContractRolesModal.jsx, RatesModal.jsx
- TailwindCSS v4 with custom theme (primary blue, success green, warning amber, error red) + light/dark toggle (deep blue/purple dark palette)
- Theme system: useTheme.jsx (React Context), CSS custom property overrides via `.dark` class on `<html>`, persisted to localStorage, respects OS preference

## Frontend E2E Tests (Playwright)
- **38 tests, all passing** (~30s total, chromium only)
- `playwright.config.js`: auto-starts backend (port 5003, nodata) + frontend (port 5173), single worker, 25s timeout
- `e2e/helpers.js`: login() with clearCookies, credential constants (ADMIN, SUPERADMIN, CONTRIBUTOR, GUEST)
- `e2e/auth.spec.js` (8 tests): login for all roles, invalid creds, empty fields, redirect, logout
- `e2e/navigation.spec.js` (9 tests): dashboard, sidebar nav links, divisions detail, settings
- `e2e/projects.spec.js` (15 tests): list, detail, sidebar cards (Budgets, Vendor Resources, Countries, etc.), role-based edit/delete visibility
- `e2e/vendors.spec.js` (6 tests): list, table, role-based create button, vendor detail navigation
- Scripts: `npm run test:e2e`, `npm run test:e2e:headed`

## API Endpoints
| Route | Methods | Auth |
|-------|---------|------|
| `/api/auth/login,logout,me` | POST,POST,GET | public/any |
| `/api/projects` | GET,POST,PUT,DELETE | reader+/admin+ |
| `/api/projects/:id/health-statuses` | GET,POST | reader+/admin+ |
| `/api/projects/:id/completions` | GET,POST,PUT,DELETE | reader+/admin+ |
| `/api/projects/:id/budgets` | GET,POST,PUT,DELETE | reader+/admin+ |
| `/api/projects/:id/budgets/total` | GET | reader+ |
| `/api/projects/:id/project-managers` | GET,PUT | reader+/admin+ |
| `/api/projects/:id/vendor-resources` | GET | reader+ |
| `/api/projects/stats` | GET | reader+ |
| `/api/budgets/:id` | GET | reader+ |
| `/api/budgets/:id/purchase-orders` | GET,POST,PUT,DELETE | reader+/admin+ |
| `/api/budgets/:id/purchase-orders/:poId/items` | GET,POST,PUT,DELETE | reader+/admin+ |
| `/api/budgets/:id/purchase-orders/:poId/items/:itemId/consumptions` | GET,POST,PUT,DELETE | reader+/admin+ |
| `/api/currencies` | GET,POST,DELETE | any/admin+ |
| `/api/divisions` | CRUD | reader+/admin+ |
| `/api/divisions/:id/focal-points` | GET,POST,PUT,DELETE | reader+/admin+ |
| `/api/divisions/:id/projects` | GET | reader+ |
| `/api/divisions/:id/project-managers` | GET | reader+ |
| `/api/vendors` | CRUD | any/admin+ |
| `/api/vendors/:vendorId/contracts` | CRUD | any/admin+ |
| `/api/vendors/:vendorId/contracts/:contractId/roles` | CRUD | any/admin+ |
| `/api/vendors/:vendorId/contracts/:contractId/roles/:roleId/rates` | CRUD | any/admin+ |
| `/api/seniorities` | GET,POST,DELETE | any/admin+ |
| `/api/users` | CRUD | superadmin |
| `/api/countries` | GET | any |
| `/api/initiatives` | CRUD | admin+ |
| `/api/deliverypaths` | CRUD | admin+ |

## Docker & Deployment
- **backend/Dockerfile**: Node.js 20 Alpine, production-only deps, non-root `node` user, exposes 5000 (internal)
- **frontend/Dockerfile**: Multi-stage build — Stage 1: Vite build with Node 20; Stage 2: Nginx Alpine runner, exposes 80
- **frontend/nginx.conf**: SPA routing (`try_files $uri $uri/ /index.html`), proxies `/api/*` to `http://backend:5000` or `${BACKEND_URL}` (templated for Render), Gzip compression, cache headers for static assets, headers forwarding (Host, X-Real-IP, X-Forwarded-For)
- **docker-compose.yml**: 
  - Backend service: builds from `./backend`, environment vars (NODE_ENV, PORT, DB_PATH, JWT_SECRET, JWT_EXPIRES_IN, CORS_ORIGIN), volume `db_data:/app/data`, healthcheck on `/health` (40s start_period, 30s interval, 3 retries)
  - Frontend service: builds from `./frontend` with build arg `VITE_API_URL`, environment var `BACKEND_URL=http://backend:5000`, ports `${FRONTEND_PORT:-80}:80`, depends_on backend with healthcheck condition
  - Named volume `db_data` for SQLite persistence
- **.env.docker.sample**: Template with all env vars documented (JWT_SECRET, JWT_EXPIRES_IN, CORS_ORIGIN, FRONTEND_PORT, VITE_API_URL)
- **.dockerignore files**: Both backend and frontend exclude node_modules, build artifacts, env files, test files, .git
- **Documentation**:
  - DOCKER.md: Local Docker usage (build, run, logs, commands, troubleshooting)
  - DEPLOYMENT.md: Production deployment guide (systemd, PM2, reverse proxy, HTTPS, backups, monitoring)
  - DOCKER_SETUP_SUMMARY.md: Quick reference and next steps
  - Updated README.md: Added Docker quick start and doc links

## Render.com Deployment (Blueprint Paid Feature - Not Used)
- **render.yaml** (initial version): Blueprint manifest with fromService references (later fixed due to invalid property)
- Issue: `hostWithScheme` not supported by Render
- Solution: Hardcoded HTTPS URLs instead

## Render.com Free Tier Deployment (Manual Docker Services)
- **render_com/ folder** (NEW): Centralized deployment documentation for free tier
  - README.md: Overview, navigation, quick start, architecture overview
  - FREE_TIER_OVERVIEW.md: Detailed explanation of limitations, free vs starter comparison, data persistence problem
  - DOCKER_SERVICE_SETUP_BACKEND.md: Step-by-step UI guide to create backend service (7 services per project, manual setup)
  - DOCKER_SERVICE_SETUP_FRONTEND.md: Step-by-step UI guide to create frontend service with BACKEND_URL env var
  - QUICK_REFERENCE.md: One-page deployment checklist with all env vars and URLs
  - TROUBLESHOOTING.md: 9 common issues (build failed, connection issues, slow service, data loss, etc.) with solutions
  - UPGRADE_TO_STARTER.md: How to upgrade from free ($0) to starter tier ($7/service/month) for persistent disk

- **render.yaml** (fixed version): 
  - Backend service: `projectstracker-api`, Docker runtime, hardcoded CORS_ORIGIN=https://projectstracker-frontend.onrender.com, env vars (NODE_ENV=production, PORT=5000, DB_PATH=/tmp/database.sqlite, JWT_SECRET=auto-generate, JWT_EXPIRES_IN=2h)
  - Frontend service: `projectstracker-frontend`, Docker runtime, hardcoded BACKEND_URL=https://projectstracker-api.onrender.com
  - No persistent disk (free tier limitation)
  - No healthcheck for frontend (Nginx starts immediately)

- **frontend/docker-entrypoint.sh**: Startup script for runtime environment variable substitution (unchanged from earlier work)

- **frontend/Dockerfile Stage 2**: Modified to include gettext, template config, entrypoint (unchanged from earlier work)

## Key Differences: Blueprint vs Manual Deployment
- Blueprint: Automated, one-click deploy of multiple services, **paid feature**
- Manual: Click each service individually, same end result, **free tier supported**
- User chose: Manual free tier approach to avoid Blueprint cost

## Country Pages (id: 293) — 2026-04-23

### Backend
- `countryService.js`: added `getProjectsByCountry(db, code)` — JOINs `projects_to_countries` → `projects` → `divisions` + `users` + subquery health status, returns same shape as projectService.getAll; added `getCountriesWithProjects(db)` — INNER JOIN to only return countries with ≥1 project, includes `COUNT(ptc.project_id) as project_count`
- `countryRoutes.js`: `GET /with-projects` (registered before `/:code`), `GET /:code/projects`
- Tests: 11 new service tests (countryService.test.js), 8 new route tests (countryRoutes.test.js), total 25 country tests

### Frontend
- `entitiesApi.js`: `getCountriesWithProjects()`, `getCountryProjects(code)`
- `pages/countries/index.jsx`: searchable table showing ISO2/ISO3, official name, project count badge
- `pages/countries/detail.jsx`: header with ISO codes + project count, projects list with StatusBadge, division, dates, owner
- `App.jsx`: `/countries` + `/countries/:code` routes
- `Sidebar.jsx`: Countries entry with Globe icon between Delivery Paths and Budgets
- `Map.jsx`: ExternalLink icon added to each country pill → `/countries/:UN_country_code`

---

## Ollama API Key Support (AI Agent) — 2026-04-23

### Backend
- `agentService.js` `SETTING_KEYS`: added `apiKey: 'agent_ollama_api_key'`
- `getSettings()`: fetches 3 keys via `Promise.all`, returns `{ ollama_url, ollama_model, ollama_api_key }`
- `updateSettings()`: upserts `ollama_api_key` alongside url/model
- `getOllamaModels(url, apiKey='')`: sends `Authorization: Bearer <key>` when key is non-empty
- `callOllama(url, model, messages, tools, apiKey='')`: same Bearer header pattern; used for both agentic loop iterations and final-response call
- `chat()`: destructures `ollama_api_key` from settings, passes to all `callOllama` invocations
- `agentRoutes.js` `GET /models`: passes `settings.ollama_api_key` to `getOllamaModels`
- `migrations/027_agent_settings.sql`: added `agent_ollama_api_key` seed row (empty string default)

### Frontend
- `settings/index.jsx` `agentForm` state: `{ ollama_url, ollama_model, ollama_api_key: '' }`
- Added `<input type="password">` field for API Key in AI Agent card
- Helper text: "Required for Ollama cloud; leave empty for local"
- Field is included in the form `PUT /api/agent/settings` payload automatically

---

## Dashboard Choropleth Map (id: 294) — 2026-04-23

### Component: `frontend/src/pages/dashboard/components/ProjectsMap.jsx`
- Fetches `GET /api/countries/with-projects` on mount (no backend changes needed)
- React-leaflet `MapContainer` + `GeoJSON` with choropleth coloring
- Color function `countColor(count, max, theme)`: returns base gray when count=0, otherwise linear RGB interpolation between scale endpoints. Ratio = `(count-1)/(max-1)` ensures 1 project = lightest blue, max projects = darkest blue
- Light scale: `#dbeafe` (#219,234,254) → `#1e3a8a` (#30,58,138); Dark scale: `#93c5fd` → `#1d4ed8`
- `onEachFeature`: uses `dataRef` + `navigateRef` to avoid stale closures; bindTooltip shows country name + project count; hover fades fill; click navigates to /countries/:code
- `geoKey = theme + ISO3 list` forces GeoJSON remount when data loads or theme changes
- Card header: 6-swatch color legend (0 → max) + "max: N" label
- Map height: 400px, zoom range 1-5, scroll wheel zoom disabled

### Dashboard integration
- `dashboard/index.jsx`: `<ProjectsMap />` added between KPI cards and People section
