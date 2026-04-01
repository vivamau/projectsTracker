# Implementation Status

## Backend
- **40 test suites, 580 tests, all passing; 89.24% coverage**
- 18 services: auth, user, project, division, country, currency, healthStatus, initiative, deliveryPath, completion, budget, purchaseOrder, purchaseOrderItem, focalPoint, vendor, vendorContract, vendorContractRole, vendorRoleRate, seniority
- 14 route files: auth, projects (includes health-statuses + completions + budgets + project-managers), divisions (includes focal-points + projects + project-managers), budgets (includes purchase-orders + purchase-order items), users, countries, currencies, initiatives, deliveryPaths, vendors (includes contracts > roles > rates), seniorities
- 13 migrations: initial schema, auth+soft-delete, completions FK, projectmanagers FK, PM division FK, vendors, PO+items, PO soft delete, vendor soft delete, PO items soft delete, vendor contracts soft delete, seniorities, vendor rates update
- 3 seed scripts: userroles, users, dummy_data (divisions, initiatives, delivery paths, projects, health statuses, completions, budgets, country links, PM assignments, focal points, vendors with 10 vendors × 1-3 contracts × 2-4 roles × 2-3 rates, 11 seniorities, 2-5 resources per vendor)

## Frontend
- Login, Dashboard (KPI + health chart + recent projects)
- Projects: list, detail (milestones, budgets, PMs with division, health timeline, countries), create/edit form (PM with division dropdown per user)
- Divisions: list (links to detail), detail (projects table, focal points with add/remove, PMs grouped by user, total budget, metadata)
- Budgets: detail page with purchase orders table, create/edit PO modals with vendor dropdown
- Purchase Orders: inline items management via PoItemsModal — nested modal for item CRUD (description, dates, days, discounted_rate, currency, vendorcontractrole_id, vendorrolerate_id, vendorresource_id)
- Vendors: list page with CRUD, vendor information (name, email, phone, address, website)
  - ContractsModal.jsx: manage contracts per vendor (create/edit/delete, nested roles management)
  - ContractRolesModal.jsx: manage roles per contract (create/edit/delete, nested rates management)
  - RatesModal.jsx: manage rates per role (currency dropdown, seniority dropdown, rate amount, description)
- Initiatives, Delivery Paths, Users, Settings
- Shared components: Sidebar, Header, Card, Modal, ConfirmDialog, StatusBadge, Pagination, SearchInput, LoadingSpinner, ProtectedRoute
- Custom pages: PoItemsModal.jsx (self-contained PO items management), ContractsModal.jsx, ContractRolesModal.jsx, RatesModal.jsx
- TailwindCSS v4 with custom theme (primary blue, success green, warning amber, error red)

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
| `/api/projects/stats` | GET | reader+ |
| `/api/budgets/:id` | GET | reader+ |
| `/api/budgets/:id/purchase-orders` | GET,POST,PUT,DELETE | reader+/admin+ |
| `/api/budgets/:id/purchase-orders/:poId/items` | GET,POST,PUT,DELETE | reader+/admin+ |
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

## Render.com Deployment
- **render.yaml**: Manifest defining two Render web services with service auto-discovery:
  - Backend service (`projectstracker-api`): Docker runtime, Starter plan, 1GB persistent disk at `/app/data`, healthcheck on `/health`, env vars (NODE_ENV=production, PORT=5000, DB_PATH=/app/data/database.sqlite, JWT_SECRET=auto-generated, JWT_EXPIRES_IN=2h, CORS_ORIGIN=fromService frontend)
  - Frontend service (`projectstracker-frontend`): Docker runtime, Starter plan, no disk, env var BACKEND_URL=fromService backend
  - Both services in `oregon` region
  - JWT_SECRET auto-generated by Render (generateValue: true)
  - CORS_ORIGIN and BACKEND_URL auto-set via fromService references (resolved at deploy time)
- **frontend/docker-entrypoint.sh**: Startup script that:
  1. Runs `envsubst '${BACKEND_URL}'` to substitute only BACKEND_URL variable (preserves nginx variables like $uri)
  2. Writes result to `/etc/nginx/conf.d/default.conf`
  3. Starts Nginx with `exec nginx -g 'daemon off;'`
- **frontend/Dockerfile Stage 2 modifications**:
  - Install `gettext` package (provides envsubst) via `apk add --no-cache gettext`
  - Copy nginx.conf to `/etc/nginx/templates/default.conf.template`
  - Copy and chmod +x `docker-entrypoint.sh`
  - Change CMD to ENTRYPOINT pointing to docker-entrypoint.sh
- **Documentation**:
  - RENDER_DEPLOYMENT.md: Full Render deployment guide (architecture, troubleshooting, monitoring, scaling, security, custom domain setup)
  - RENDER_SETUP_SUMMARY.md: Quick reference for Render setup and deployment steps
