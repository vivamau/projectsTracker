# Lessons Learned

## TailwindCSS v4: Custom CSS must be in @layer base
Custom CSS rules (like `* { margin: 0; padding: 0; }`) placed outside any `@layer` will override ALL Tailwind utility classes because un-layered CSS has higher cascade priority than layered CSS. Always wrap custom styles in `@layer base {}`.

## SQLite ALTER TABLE errors are expected on re-run
Migration runner silently ignores "duplicate column name" and "table already exists" errors to support idempotent re-runs.

## healthStatusService needs deterministic ordering
When multiple health statuses share the same `healthstatus_create_date` (same millisecond), use `id DESC` as a tiebreaker in ORDER BY to ensure `getLatest` returns the correct result.

## divisionService softDelete must filter by is_deleted
The WHERE clause in softDelete must include `AND (division_is_deleted = 0 OR division_is_deleted IS NULL)` to prevent re-deleting already-deleted records.

## Countries table uses UN_country_code, not country_code
The `countries` table PK is `UN_country_code` (INTEGER), and the junction table `projects_to_countries` also uses `UN_country_code`, not `country_code`.

## macOS port 5000 conflict
Port 5000 is occupied by macOS ControlCenter. Use 5001 for the backend.

## Database files must be fully cleaned
When recreating a SQLite database, remove `.sqlite-wal` and `.sqlite-shm` files too, not just the main `.sqlite` file, to avoid SQLITE_CORRUPT errors.

## Dummy data seeding runs on app startup only
The `seed_dummy_data.js` function runs during app initialization (in `index.js`). If a feature depends on seeded data (e.g., seniorities dropdown), that data only exists after a fresh app start. Changes to seeding logic won't take effect until the next app restart.

## React dropdown handling for nested response data
When fetching API data for React dropdowns, the response structure varies:
- Some APIs return `{ success: true, data: [] }`
- Others may return `{ data: [] }` directly
- Handle both with: `const data = response.data?.data || response.data || []`
- Always validate `Array.isArray()` before rendering options
- Add console.error logging in catch blocks for troubleshooting

## Consumption balance calculation belongs in SQL, not frontend
When displaying derived data like "days balance" (allocated - consumed) for a list of items, compute the aggregate via SQL LEFT JOIN subquery rather than N+1 API calls from the frontend. The `getByPoId` query joins a `SUM(consumption_days)` subquery, returning `total_days_consumed` alongside each item. This avoids extra network round-trips per item.

## TDD discipline: write service tests before service changes
When modifying an existing service (e.g., adding a JOIN to healthStatusService), write the failing test first — even if the change seems trivial. Without a failing test first, the implementation-then-test order means you never see red, which undermines confidence in the test. The route-level TDD was correct (13 tests red → green); the service JOIN change was implemented before adding tests — a gap to avoid.

## healthstatus_types seeds with explicit IDs for FK compatibility
The existing healthstatuses.healthstatus_value column stores 1/2/3 as integer codes. To connect it to healthstatus_types, seeds must use INSERT OR IGNORE with explicit id=1/2/3. Without explicit IDs, AUTOINCREMENT would assign different IDs and break the FK relationship.

## Duplicate API call lines can silently corrupt data flow
When editing JSX files, be careful not to leave duplicate lines (e.g., `getConsumptions(...)` called twice in a useEffect). The first call's promise is orphaned and never awaited, causing silent failures. Always diff carefully after edits.
