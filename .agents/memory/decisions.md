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
