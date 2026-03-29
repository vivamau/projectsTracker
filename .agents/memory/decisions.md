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
