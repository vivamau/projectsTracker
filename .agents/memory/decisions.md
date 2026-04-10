# Architectural Decisions

## Cookie-only JWT Auth
**Date:** 2026-03-29
**Decision:** JWT stored in HttpOnly cookies only, never in response body. SameSite=Lax, Secure in production.
**Status:** Implemented.

## Service Dependency Injection
**Date:** 2026-03-29
**Decision:** All services accept `db` parameter for testability with in-memory SQLite in tests.
**Status:** Implemented.

## Append-only Health Statuses
**Date:** 2026-03-29
**Decision:** Health statuses are append-only (no update/delete) to preserve audit trail.
**Status:** Implemented.

## Completions as Milestones
**Date:** 2026-03-29
**Decision:** Reuse existing `completions` table (had no project FK) to store project milestones with completion percentage (0-100). Added `project_id` FK and `completion_is_deleted` via migration 003. Unlike health statuses, completions support update and soft delete.
**Status:** Implemented.

## Schema Typo Preserved
**Date:** 2026-03-29
**Decision:** Keep `deilverypath_description` typo as-is in database schema to avoid breaking changes.
**Status:** Accepted.

## Health Distribution as Object Map
**Date:** 2026-03-29
**Decision:** `getStats()` returns healthDistribution as `{ "3": count, "2": count }` object, not array.
**Status:** Implemented.

## Port 5001 for Backend
**Date:** 2026-03-29
**Decision:** Use port 5001 instead of 5000 because macOS ControlCenter occupies port 5000.
**Status:** Implemented.

## TailwindCSS v4 Layer Rules
**Date:** 2026-03-29
**Decision:** All custom CSS must be inside `@layer base` to avoid overriding Tailwind utility classes. Un-layered CSS has higher cascade priority than `@layer utilities` in CSS cascade layers.
**Status:** Implemented (fixed broken layout).

## PM-Division Link is Per-Project
**Date:** 2026-03-30
**Decision:** The association between a project manager and a division is stored on the `projects_to_projectmanagers` junction table (not on the `projectmanagers` table), so a PM can be linked to different divisions on different projects. `syncProjectManagers` accepts `[{user_id, division_id}]` objects.
**Status:** Implemented (migration 005).

## Focal Points are Hard Deletes
**Date:** 2026-03-30
**Decision:** The `focalpoints` table has no soft delete column — focal points are physically deleted. This matches the simple junction table schema (id, division_id, user_id) with no timestamps.
**Status:** Implemented.

## Vendor Selection in Purchase Orders is Optional
**Date:** 2026-03-31
**Decision:** Purchase orders can be created without a vendor. The vendor dropdown in PO forms is optional with a "Select a vendor..." placeholder. Users can later update POs to add/change vendors. This allows flexibility in PO creation workflow.
**Status:** Implemented.

## PO Items - Core Fields Only (Deferred Vendor Role FKs)
**Date:** 2026-03-31
**Decision:** Implement PO items with core fields only: description, start_date (required), end_date, days, discounted_rate, currency_id. Vendor role FKs (vendorcontractrole_id, vendorrolerate_id, vendorresource_id) are left nullable and deferred because their parent tables (contracts, roles, resources) have zero backend service coverage. Adding those FKs would require implementing 3-4 new services in parallel. Defer to next iteration when vendor sub-resource services are built.
**Status:** Implemented.

## PO Items Modal - Self-Contained Component
**Date:** 2026-03-31
**Decision:** Implement PO items management in a separate PoItemsModal.jsx component (not inline expand rows). This keeps the parent detail.jsx under 1000 lines, matches existing modal-based patterns (vendors, POs, budgets all use modals), and provides cleaner component separation. The modal is nested (outer: items list, inner: item create/edit form).
**Status:** Implemented.

## Vendor Rates Support Complex Pricing via Seniority & Currency
**Date:** 2026-03-31
**Decision:** Vendor role rates table now supports multiple rates per role via:
  1. Different currencies (USD, EUR, GBP, CHF, JPY)
  2. Different seniority levels (11 levels: Entry to Expert)
  3. Optional description for business context (e.g., "Senior staff on retainer")
  
This enables complex vendor pricing models where the same role has different hourly rates depending on worker seniority and currency. `vendorrolerates` has: rate, currency_id (FK), seniority_id (FK, nullable), description (nullable).
**Status:** Implemented (migrations 012, 013).

## Nested Modal Hierarchy for Vendor Management
**Date:** 2026-03-31
**Decision:** Implement 3-level nested modal structure: Vendor → Contract (ContractsModal) → Role (ContractRolesModal) → Rate (RatesModal). Each level has its own CRUD with Settings icon to drill down. This allows managing the full vendor-contract-role-rate hierarchy from the vendors page without separate pages.
**Status:** Implemented (all three modals).

## Seed Enhanced with Rate Complexity
**Date:** 2026-03-31
**Decision:** `seed_dummy_data.js` now generates diverse rate data:
  - 11 seniority levels (from Entry Level to Expert)
  - Per vendor: 1-3 contracts, 2-4 roles per contract, 2-3 rates per role
  - Per rate: varied seniority (random), 1-2 currencies, optional description
  - Per vendor: 2-5 resources assigned
  
This creates realistic complexity for testing vendor pricing scenarios.
**Status:** Implemented.

## Docker Architecture - Single Entry Point via Nginx Proxy
**Date:** 2026-04-01
**Decision:** All browser traffic goes through a single Nginx container on port 80:
  1. Nginx serves the React SPA static build (dist/)
  2. Nginx proxies all `/api/*` requests to the Express backend service on port 5000 (internal only)
  3. Backend port 5000 is NOT exposed to the host, only accessible within the Docker network
  4. Frontend axios client uses relative paths `/api/*` (no absolute URLs, no CORS needed)

This eliminates CORS complexity, provides a single entry point for deployment, and ensures clean network isolation. Alternative considered (frontend with absolute API URLs) was rejected because it requires CORS configuration and exposes the backend port.
**Status:** Implemented (docker-compose.yml, frontend/Dockerfile, frontend/nginx.conf).

## Vite API URL - Build Time vs Runtime
**Date:** 2026-04-01
**Decision:** Vite bakes environment variables at build time. The frontend uses hardcoded relative paths `/api/*` in axios client (baseURL), so `VITE_API_URL` is accepted in docker-compose.yml but left empty by default. This allows future flexibility (e.g., pointing to a different backend domain) without requiring frontend rebuild, but currently the relative path approach is preferred.
**Status:** Implemented (VITE_API_URL build arg in docker-compose.yml, frontend axios uses baseURL: '/api').

## SQLite Persistence via Named Docker Volume
**Date:** 2026-04-01
**Decision:** The SQLite database at `/app/data/database.sqlite` is mounted to a named Docker volume (`db_data`) so that data persists across container restarts. Alternative approaches rejected:
  1. Host bind mount (breaks on different machines/servers)
  2. Docker volume driver other than local (unnecessarily complex)
  
Named volumes are portable, backed up with standard Docker tools, and work identically across dev/production.
**Status:** Implemented (docker-compose.yml volumes section).

## Healthcheck Before Frontend Start
**Date:** 2026-04-01
**Decision:** Frontend container depends on backend's healthcheck endpoint (`GET /health`), preventing Nginx from serving a broken app while the backend is still initializing. The healthcheck waits 40 seconds before considering the backend ready (to allow migrations to complete), retries 3 times, and checks every 30 seconds.
**Status:** Implemented (docker-compose.yml healthcheck + depends_on condition).

## Render.com Deployment - Preserve Nginx Proxy Architecture
**Date:** 2026-04-01
**Decision:** Render.com is a managed platform where each service gets its own public URL. The cookie-based JWT auth (SameSite=Lax) breaks on cross-domain API calls. Solution: preserve the Nginx proxy architecture — frontend proxies `/api/*` to backend via `${BACKEND_URL}` environment variable. Frontend and backend are separate Render web services, but frontend's Nginx makes them appear as one origin to the browser.

Alternative rejected: Direct VITE_API_URL would require cross-domain API calls → SameSite=Lax cookies not sent → auth fails.

**Why**: Cookie-based auth requires same-origin requests. Nginx proxy preserves this while allowing separate service deployment.
**Status:** Implemented (render.yaml with fromService references, frontend/docker-entrypoint.sh for runtime substitution).

## Runtime Environment Substitution for Render
**Date:** 2026-04-01
**Decision:** Nginx config cannot be templated at build time (frontend/Dockerfile is built before service URLs exist). Instead: copy nginx.conf as `/etc/nginx/templates/default.conf.template`, then use `docker-entrypoint.sh` to run `envsubst '${BACKEND_URL}'` at container startup. This substitutes only BACKEND_URL (preserving nginx variables like $uri) and writes to `/etc/nginx/conf.d/default.conf` before starting Nginx.

Alternative rejected: Building Nginx config at build time would require hardcoding URLs (not possible).
**Status:** Implemented (frontend/docker-entrypoint.sh + updated Dockerfile Stage 2 with gettext).

## Render Service Auto-Discovery via fromService
**Date:** 2026-04-01
**Decision:** In render.yaml, use `fromService` references to automatically set environment variables based on dependent services:
  - Backend's `CORS_ORIGIN` references frontend's `hostWithScheme` (e.g., https://projectstracker-frontend.onrender.com)
  - Frontend's `BACKEND_URL` references backend's `hostWithScheme` (e.g., https://projectstracker-api.onrender.com)

Render resolves these at deploy time, eliminating manual URL configuration. This works even with circular references (each service references the other).
**Status:** Implemented (render.yaml with fromService blocks).

## Render Plan Choice - Starter for Both Services
**Date:** 2026-04-01
**Decision:** Both backend and frontend services use Starter plan ($7/month each, $14 total):
  - Backend: Starter required for persistent disk (SQLite needs storage)
  - Frontend: Starter chosen for consistency (Free tier has 15-min inactivity sleep, unsuitable for SPA)
  
Free tier rejected because: SQLite requires persistent disk (Starter only), and Free tier services sleep after inactivity (frontend would lag on cold starts).
**Status:** Configured in render.yaml (plan: starter for both services).

## Render Persistent Disk - 1GB SQLite Storage
**Date:** 2026-04-01
**Decision:** Backend service uses a 1GB persistent disk mounted at `/app/data` to store SQLite database. Disk survives container restarts and redeployments. No backup mechanism in render.yaml (manual export needed if data must be preserved long-term).

Why 1GB: Sufficient for small-to-medium project tracking dataset. Can be increased later via Render Dashboard.
**Status:** Implemented (render.yaml disk config with 1GB sizeGB).

## Render Blueprint vs Manual Service Setup - Critical Deployment Process
**Date:** 2026-04-01
**Decision:** `render.yaml` is a **Blueprint manifest** (YAML format), not a Dockerfile. When deploying to Render:
  - ❌ DO NOT use: Dashboard → New Service → Set Dockerfile Path to render.yaml
  - ✅ DO use: Blueprints → New Blueprint → Connect Repo → Render auto-detects render.yaml

Why: Render auto-detects `render.yaml` in the repo root and uses it to create multiple services automatically. Each service in render.yaml specifies its own Dockerfile path:
  - Backend service points to: ./backend/Dockerfile
  - Frontend service points to: ./frontend/Dockerfile

If you try to use render.yaml as a Dockerfile path, Render parses it as Docker instructions and fails on `services:` (not a valid Docker keyword).

Common mistake: Confusing "New Service" (manual, single service) with "New Blueprint" (automatic, multi-service).

**Status:** Identified and documented (RENDER_QUICK_FIX.md, RENDER_BLUEPRINT_VS_MANUAL.md, RENDER_CLICK_BY_CLICK.md).

## Render Free Tier with Manual Docker Services (vs Blueprint Paid Feature)
**Date:** 2026-04-01
**Decision:** User prefers free tier over paid Blueprint feature. Approach:
  1. Use Render's free tier ($0/month for both services)
  2. Create services manually via UI (not Blueprint)
  3. Each service: Dashboard → New Service → configure Docker
  4. Backend gets hardcoded `CORS_ORIGIN=https://projectstracker-frontend.onrender.com`
  5. Frontend gets hardcoded `BACKEND_URL=https://projectstracker-api.onrender.com`

Trade-offs (Free Tier):
  - ✅ No cost ($0/month)
  - ✅ Full functionality (can deploy and test)
  - ✅ Easy to upgrade later (just click to Starter)
  - ❌ Data lost on restart (SQLite in /tmp)
  - ❌ Service sleeps after 15 min idle
  - ❌ First request after sleep is slow (~20-30s)

When to upgrade: When you need persistent data or 24/7 uptime → Starter tier ($7/service/month).

**Status:** Implemented (created render_com/ folder with 7 comprehensive guides for manual free tier deployment).

## Hardcoded Service URLs in render.yaml (not fromService)
**Date:** 2026-04-01
**Decision:** Render doesn't support `hostWithScheme` in fromService property. Error: "invalid service property: hostWithScheme. Valid properties are: host, hostport, port, connectionString."

Solution: Hardcode full HTTPS URLs since Render service URLs are deterministic:
  - Service name: `projectstracker-api` → URL: `https://projectstracker-api.onrender.com`
  - Service name: `projectstracker-frontend` → URL: `https://projectstracker-frontend.onrender.com`

If service name changes, update URLs in render.yaml accordingly.

**Status:** Implemented (render.yaml fixed with hardcoded URLs).

## PO Item Days Column: Balance (Allocated) Display Format
**Date:** 2026-04-01
**Decision:** The Days column in the PO items list shows `balance (allocated)` format, e.g. `1.5 (2)` where:
- `1.5` = allocated days minus total consumed days (current balance)
- `2` = original `purchaseorderitems_days` (allocated days)

The backend `getByPoId` query LEFT JOINs a subquery that sums `consumption_days` from `poitem_consumptions` to compute `total_days_consumed` per item. The frontend calculates `allocated - total_days_consumed` to show the balance.

**Status:** Implemented (purchaseOrderItemService.getByPoId updated, PoItemsModal.jsx updated).

## Consumption Tracking as Separate Table (Not Modifying PO Items)
**Date:** 2026-04-01
**Decision:** Monthly consumption entries are stored in a separate `poitem_consumptions` table (not by updating the PO item's `purchaseorderitems_days` field). This preserves the original allocation as an immutable reference while allowing granular monthly tracking. UNIQUE constraint on (purchaseorderitem_id, consumption_month) prevents duplicate entries.

**Status:** Implemented (migration 016, poitemConsumptionService.js, consumption routes).

## Custom SVG Pie Chart Over External Library
**Date:** 2026-04-03
**Decision:** Built a custom SVG pie chart component (`PieChart.jsx`) instead of adding an external charting library (recharts, chart.js, etc.). Reasons:
- Zero additional dependencies (reduces bundle size and vulnerability surface)
- Simple use case only needs basic pie charts with percentage labels
- Full control over styling and theming (matches existing TailwindCSS design)
- Easy to maintain and modify

Alternative rejected: Adding recharts/chart.js would add ~50-200KB to bundle for a single chart type.

**Status:** Implemented (PieChart.jsx with `describeArc()` helper, hover effects, empty state handling).

## healthstatus_types as a separate type-definition table
**Date:** 2026-04-07
**Decision:** The existing `healthstatuses` table is a per-project history log (has project_id, stores append-only entries). A new `healthstatus_types` table was created as the type-definition table. `healthstatuses.healthstatus_value` acts as a FK referencing `healthstatus_types.id`. Seeds ensure id=1/2/3 match the existing integer codes already in production data.
**Status:** Implemented (migrations 024 + 025, healthStatusTypeRoutes.js, healthStatusService JOIN).

## authorizeProjectMember middleware for contributor PM/SA edit
**Date:** 2026-04-07
**Decision:** Contributors who are PM or SA on a project can edit it (all writes except create/delete). Implemented as a custom async middleware `authorizeProjectMember` inside `createProjectRoutes` where `db` is in scope — the existing `authorize()` middleware is role-string only and has no DB access. The middleware allows superadmin/admin unconditionally, otherwise SQL-checks the PM/SA junction tables.
**Status:** Implemented (projectRoutes.js, rolematrix.md updated).

## Project Role Assignments — Database Redesign
**Date:** 2026-04-08
**Decision:** Replace the two separate role-specific table pairs (`projectmanagers`/`projects_to_projectmanagers` and `solutionarchitects`/`projects_to_solutionarchitects`) with a generic model:
- `project_roles` — lookup table of named roles, managed by superadmin only, seeded with "Project Manager" (id=1) and "Solution Architect" (id=2)
- `project_assignments` — single junction table: project_id + user_id + project_role_id + division_id + dates + percentage

This makes adding new roles (Product Owner, Service Designer, etc.) a pure data operation with no code changes required. Existing PM/SA data migrated via migration 026. Old tables dropped after migration.
**Status:** Planned (migration 026, new services: projectRoleService + projectAssignmentService, new route: projectRoleRoutes).

## Dark Theme via CSS Custom Properties + .dark Class
**Date:** 2026-04-03
**Decision:** Implement dark mode by overriding Tailwind v4 `@theme` CSS variables under a `.dark` class on `<html>`. Reasons:
- Tailwind v4 uses CSS-based `@theme` for all design tokens -- overriding the same CSS variables is the natural approach
- No need for `dark:` variants on every component -- all existing components automatically adapt
- `.dark` class toggled via React Context (useTheme.jsx) + `document.documentElement`
- Theme persisted to `localStorage`, falls back to `prefers-color-scheme` on first visit
- Sidebar (#001529) stays the same in both modes since it's already dark

Palette: deep blue/purple tones (surface #1a1a2e, card #252540, text #e0e0e0).

Alternative rejected: Tailwind's built-in `dark:` variant strategy would require adding `dark:` classes to every component (hundreds of changes).

**Status:** Implemented (useTheme.jsx, index.css .dark block, Header.jsx toggle, main.jsx provider).

## Playwright E2E Tests with Real Backend
**Date:** 2026-04-10
**Decision:** Use Playwright with a real backend server (not mocked) for E2E tests. The `playwright.config.js` starts both backend (`node index.js nodata`) and frontend (`npm run dev`) as webServers. Tests use the admin/superadmin/contributor/guest credentials from `seed_users.js`. The `nodata` flag runs minimal seeding (no dummy data) for faster startup.

Alternative rejected: Mocked API tests would not catch real integration issues (CORS, cookie handling, proxy config).

**Status:** Implemented (38 tests across 4 spec files).

## Vendor Resources on Project Details — Read-Only via PO Items
**Date:** 2026-04-10
**Decision:** Vendor resources are displayed on the project detail page as a read-only card. The data flows through PO items (not a direct project→resource link). Resources are deduplicated by vendorresource_id, with the latest contract role shown. Admin "Edit" button navigates to the assignment modal for link/unlink. No new database tables or migrations needed.

**Status:** Implemented (vendorResourceService.getByProjectId, GET /:id/vendor-resources, detail.jsx card).
