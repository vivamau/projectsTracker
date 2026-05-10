---
inclusion: always
---

# Development Memory & Conventions

## Session Continuity

When starting work on this project, check these files for context:

- `.agents/memory/progress.md` — current state of work
- `.agents/memory/lessons.md` — past mistakes to avoid
- `.agents/memory/blockers.md` — known issues
- `.agents/memory/decisions.md` — architectural decisions already made

After completing a session, log progress in `.agents/memory/sessions/YYYY-MM-DD_description.md`.

## Critical Project-Specific Rules

### Port Configuration
- Backend runs on port **5001** (not 5000). macOS ControlCenter occupies port 5000.

### Database Schema Quirks
- The column `deilverypath_description` has a typo — do NOT rename it. This is an accepted decision.
- `countries` table PK is `UN_country_code` (INTEGER), not `country_code`.
- `healthstatuses.healthstatus_value` stores integer codes (1/2/3) that reference `healthstatus_types.id`.
- Health statuses are **append-only** (no update/delete) to preserve audit trail.
- PO item consumption uses a separate `poitem_consumptions` table — never modify `purchaseorderitems_days` directly.

### SQLite Handling
- When recreating a database, delete `.sqlite`, `.sqlite-wal`, AND `.sqlite-shm` files.
- Migrations must use `IF NOT EXISTS` for idempotency.
- Migration runner silently ignores "duplicate column name" and "table already exists" errors.
- Seed scripts with explicit IDs must use `INSERT OR IGNORE` to maintain FK compatibility.

### Authentication & Security
- JWT stored in HttpOnly cookies only — never in response body or localStorage.
- Cookie config: `HttpOnly; Path=/; SameSite=Lax` (add `Secure` in production).
- Inactive users enforced at service layer: force `userrole_id=4` and `user_password_hash=NULL`.
- Block login for inactive users before bcrypt compare.

### Default Credentials (Development)
- superadmin / adminpassword
- admin / adminpassword (note: CLAUDE.md says "reader" but actual seed creates admin)
- contributor / readerpassword
- guest / guestpassword

## Code Patterns to Follow

### Backend
- All services accept a `db` parameter for dependency injection and testability.
- Derived data (balances, aggregates) should be computed in SQL via JOINs/subqueries, not N+1 frontend calls.
- Express route ordering: register literal paths (`/with-projects`) before parameterized paths (`/:code`).
- Error catch blocks in routes need `jest.spyOn(service, 'method').mockRejectedValueOnce()` to test.
- Always call `jest.restoreAllMocks()` in `afterEach`.

### Frontend
- TailwindCSS v4: all custom CSS must be inside `@layer base {}` — un-layered CSS overrides utility classes.
- Tailwind v4 doesn't compile classes not in initial scan — use inline `style` props for dynamic colors.
- Dark mode uses CSS custom properties under `.dark` class on `<html>`, not `dark:` variants.
- API response handling: `const data = response.data?.data || response.data || []` then `Array.isArray()` check.
- react-leaflet `onEachFeature` runs outside React render — use refs for navigate/data, not hooks.
- GeoJSON components re-key on data/theme change to force remount with fresh ref values.

### Testing
- TDD: write failing test first, then implement. Never skip the red phase.
- Backend coverage threshold: 85%.
- Playwright: use `htmlFor`/`id` on labels, `clearCookies()` between user switches, prefer role selectors over text selectors.
- E2E tests run against real backend with `node index.js nodata` (minimal seeding).
- Do not test `agentService.chat` without a live Ollama server — test only exported helpers.

## Architecture Decisions Summary

- **Project roles**: Generic `project_roles` + `project_assignments` tables (not separate PM/SA tables).
- **PM-Division link**: Stored per-project on the junction table, not on the PM record.
- **Focal points**: Hard deletes (no soft delete column).
- **Vendor hierarchy**: 3-level nested modals (Vendor → Contract → Role → Rate).
- **Vendor rates**: Support multiple currencies and 11 seniority levels per role.
- **Vendor resources on projects**: Read-only, derived through PO items (no direct link table).
- **Docker**: Single Nginx entry point proxying `/api/*` to Express (no CORS needed).
- **Render.com**: Runtime `envsubst` for `BACKEND_URL` in Nginx config at container startup.
