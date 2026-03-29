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
