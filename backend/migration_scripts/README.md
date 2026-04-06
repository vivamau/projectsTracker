# Data Migration — frankeeno-be → projectsTracker

These scripts import data from the legacy `frankeeno-be` database into projectsTracker. They are one-time migration scripts and must be run in the order listed below.

## Prerequisites

- `sqlite3` CLI installed and available on your `PATH`
- `node` 20.x installed
- The projectsTracker backend dependencies installed (`npm install` inside `backend/`)
- The source database available at `/Users/vivamau/projects/frankeeno-be/db/projects.db`
  - If the source database is at a different path, update the `ATTACH DATABASE` path at the top of each `.sql` file before running
- The target database exists at `backend/data/database.sqlite` and all schema migrations have been applied (`node index.js nodata` will do this on first run)
- Schema migration `019_project_statuses.sql` must have been applied — it is picked up automatically by the migration runner on startup

## ⚠️ Warning

**These scripts replace existing data.** Running them will delete all current projects, vendors, budgets, purchase orders, vendor resources, and related records before importing. Users, roles, divisions, initiatives, delivery paths, currencies, seniorities, and app settings are preserved.

Back up the database before running:

```bash
cp backend/data/database.sqlite backend/data/database.sqlite.bak_$(date +%Y%m%d_%H%M%S)
```

---

## Run order

All commands should be run from the **project root** (`/path/to/projectsTracker`).

### Step 1 — Main data import

Imports vendors, vendor contracts (LTAs), vendor contract roles, vendor role rates, vendor resources (external resources), projects, project-to-country links, budgets, purchase orders, purchase order items, and PO consumptions.

```bash
sqlite3 backend/data/database.sqlite < backend/migration_scripts/migrate_from_frankeeno.sql
```

Expected output (row counts):

| Table | Rows |
|---|---|
| countries | 276 |
| vendors | 53 |
| vendorcontracts | 31 |
| vendorcontractroles | 346 |
| vendorrolerates | 876 |
| vendorresources | 319 |
| projects | 155 |
| projects_to_countries | 353 |
| budgets | 1 |
| purchaseorders | 1,829 |
| purchaseorderitems | 1,829 |
| poitem_consumptions | 1,717 |

---

### Step 2 — Create yearly budgets

Creates one budget record per year per project (from the project's start year up to 2026), and links each budget to its project via `projects_to_budgets`. The single budget imported in Step 1 is replaced.

```bash
node backend/migration_scripts/seed_yearly_budgets.js
```

Expected output:

```
Projects processed : 155
Budgets created    : 661
Project links      : 661
```

---

### Step 3 — Link purchase orders to budgets

Associates each purchase order to the budget that matches its project and start year. POs whose year falls outside the project's budget range are linked to the nearest available budget year.

```bash
sqlite3 backend/data/database.sqlite < backend/migration_scripts/link_purchaseorders_to_budgets.sql
```

Expected output:

```
Linked:   1829
Unlinked: 0
```

---

### Step 4 — Seed project statuses

Populates the `project_statuses` lookup table and sets `project_status_id` on each project row.

```bash
sqlite3 backend/data/database.sqlite < backend/migration_scripts/seed_project_statuses.sql
```

Expected output:

```
project_statuses rows:    9
projects with status set: 154
projects without status:  1
```

> The 1 project without a status (AskMSD) has no status set in the source database.

---

### Step 5 — Seed health statuses

Creates one health status record per project based on the project's lifecycle status, using the following mapping:

| Source status | Health value | Label |
|---|---|---|
| development, improvement, maintenance, support | 3 | On Track |
| discovery, queued | 2 | Needs Attention |
| discontinued, ended, support ended | 1 | At Risk |

```bash
sqlite3 backend/data/database.sqlite < backend/migration_scripts/seed_healthstatuses_from_project_status.sql
```

Expected output:

| Value | Status | Projects |
|---|---|---|
| 1 | discontinued | 17 |
| 1 | ended | 40 |
| 1 | support ended | 8 |
| 2 | discovery | 5 |
| 2 | queued | 5 |
| 3 | development | 16 |
| 3 | improvement | 19 |
| 3 | maintenance | 43 |
| 3 | support | 1 |

---

### Step 6 — Import activities

Imports sprint/iteration ticket metrics from the source `activity` table into `activities`. Only rows whose `project_id` exists in the target are imported.

```bash
sqlite3 backend/data/database.sqlite < backend/migration_scripts/import_activities.sql
```

Expected output:

```
Activities imported: 1317
Projects covered:    71
```

---

### Step 7 — Import technology stacks

Populates `tec_stacks` (39 rows) and `projects_to_tec_stacks` (28 links across 10 projects).

```bash
sqlite3 backend/data/database.sqlite < backend/migration_scripts/import_tec_stacks.sql
```

Expected output:

```
tec_stacks imported:         39
project-tec_stack links:     28
projects with a tec stack:   10
```

---

### Step 8 — Import project-to-vendor-resource assignments

Populates the `projects_to_vendorresources` junction table from `external_resource.project_id` in the source database. IDs are preserved so no join key is needed — `external_resource.id` equals `vendorresources.id`.

```bash
sqlite3 backend/data/database.sqlite < backend/migration_scripts/import_project_assignments.sql
```

Expected output:

```
total_assignments | active | inactive
319               | 207    | 112
```

---

### Step 9 — Import focalpoints as guest users

Creates one user per focalpoint with role `guest` and password `guestpassword`. Skips any focalpoint whose email already exists in the `users` table.

```bash
node backend/migration_scripts/import_focalpoints_as_users.js
```

Expected output:

```
Focalpoints processed : 89
Users inserted        : 89
Skipped (duplicate)   : 0
```

---

## Full run (copy-paste)

```bash
# 0. Backup
cp backend/data/database.sqlite backend/data/database.sqlite.bak_$(date +%Y%m%d_%H%M%S)

# 1. Main import
sqlite3 backend/data/database.sqlite < backend/migration_scripts/migrate_from_frankeeno.sql

# 2. Yearly budgets
node backend/migration_scripts/seed_yearly_budgets.js

# 3. Link POs to budgets
sqlite3 backend/data/database.sqlite < backend/migration_scripts/link_purchaseorders_to_budgets.sql

# 4. Project statuses
sqlite3 backend/data/database.sqlite < backend/migration_scripts/seed_project_statuses.sql

# 5. Health statuses
sqlite3 backend/data/database.sqlite < backend/migration_scripts/seed_healthstatuses_from_project_status.sql

# 6. Activities
sqlite3 backend/data/database.sqlite < backend/migration_scripts/import_activities.sql

# 7. Technology stacks
sqlite3 backend/data/database.sqlite < backend/migration_scripts/import_tec_stacks.sql

# 8. Project-vendor resource assignments
sqlite3 backend/data/database.sqlite < backend/migration_scripts/import_project_assignments.sql

# 9. Focalpoints as guest users
node backend/migration_scripts/import_focalpoints_as_users.js
```
