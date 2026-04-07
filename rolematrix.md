# Role Matrix

## Roles

| Role | Description |
|------|-------------|
| **superadmin** | Full system access including user management, audit logs, and settings |
| **admin** | Full access to project data and content, no user management or audit logs |
| **contributor** | Read-only by default; can edit projects where they are assigned as PM or Solution Architect |
| **guest** | Read-only access to all content |

---

## Feature Access

### User Management

| Action | superadmin | admin | contributor | guest |
|--------|:---:|:---:|:---:|:---:|
| View users list | ✓ | ✓ | — | — |
| View user detail page | ✓ | — | — | — |
| View user project portfolio | ✓ | — | — | — |
| Create user | ✓ | — | — | — |
| Edit user | ✓ | — | — | — |
| Delete user | ✓ | — | — | — |

### Projects

| Action | superadmin | admin | contributor | guest |
|--------|:---:|:---:|:---:|:---:|
| View project list | ✓ | ✓ | ✓ | ✓ |
| View project detail | ✓ | ✓ | ✓ | ✓ |
| Create project | ✓ | ✓ | — | — |
| Edit project ¹ | ✓ | ✓ | PM/SA only | — |
| Delete project | ✓ | ✓ | — | — |
| Manage health statuses ¹ | ✓ | ✓ | PM/SA only | — |
| Manage milestones / completions ¹ | ✓ | ✓ | PM/SA only | — |
| Assign project managers ¹ | ✓ | ✓ | PM/SA only | — |
| Assign solution architects ¹ | ✓ | ✓ | PM/SA only | — |
| Manage tech stacks ¹ | ✓ | ✓ | PM/SA only | — |
| Manage vendor resource assignments ¹ | ✓ | ✓ | PM/SA only | — |

> ¹ **PM/SA only** — a contributor can perform this action only on projects where they are assigned as Project Manager or Solution Architect.

### Budgets & Purchase Orders

| Action | superadmin | admin | contributor | guest |
|--------|:---:|:---:|:---:|:---:|
| View budgets | ✓ | ✓ | ✓ | ✓ |
| Create / edit / delete budget ¹ | ✓ | ✓ | PM/SA only | — |
| Create / edit / delete purchase order ¹ | ✓ | ✓ | PM/SA only | — |
| Manage PO line items ¹ | ✓ | ✓ | PM/SA only | — |
| Record / edit consumption ¹ | ✓ | ✓ | PM/SA only | — |

### Divisions

| Action | superadmin | admin | contributor | guest |
|--------|:---:|:---:|:---:|:---:|
| View divisions | ✓ | ✓ | ✓ | ✓ |
| Create / edit / delete division | ✓ | ✓ | — | — |
| Manage focal points | ✓ | ✓ | — | — |

### Vendors & Contracts

| Action | superadmin | admin | contributor | guest |
|--------|:---:|:---:|:---:|:---:|
| View vendors | ✓ | ✓ | ✓ | ✓ |
| Create / edit / delete vendor | ✓ | ✓ | — | — |
| Manage contracts | ✓ | ✓ | — | — |
| Manage contract roles | ✓ | ✓ | — | — |
| Manage role rates | ✓ | ✓ | — | — |

### Initiatives & Delivery Paths

| Action | superadmin | admin | contributor | guest |
|--------|:---:|:---:|:---:|:---:|
| View initiatives | ✓ | ✓ | ✓ | ✓ |
| Create / edit / delete initiative | ✓ | ✓ | — | — |
| View delivery paths | ✓ | ✓ | ✓ | ✓ |
| Create / edit / delete delivery path | ✓ | ✓ | — | — |

### Reference Data (Seniorities, Currencies, Project Statuses, Countries, Tech Stacks)

| Action | superadmin | admin | contributor | guest |
|--------|:---:|:---:|:---:|:---:|
| View | ✓ | ✓ | ✓ | ✓ |
| Create / delete seniority | ✓ | ✓ | — | — |
| Create / delete currency | ✓ | ✓ | — | — |

### Audit Logs

| Action | superadmin | admin | contributor | guest |
|--------|:---:|:---:|:---:|:---:|
| View audit log page | ✓ | — | — | — |
| Filter and search logs | ✓ | — | — | — |
| View log statistics | ✓ | — | — | — |
| Clean up old logs | ✓ | — | — | — |

### Settings

| Action | superadmin | admin | contributor | guest |
|--------|:---:|:---:|:---:|:---:|
| View / edit app settings | ✓ | — | — | — |

---

## Navigation Visibility

| Page | superadmin | admin | contributor | guest |
|------|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Projects | ✓ | ✓ | ✓ | ✓ |
| Divisions | ✓ | ✓ | ✓ | ✓ |
| Initiatives | ✓ | ✓ | ✓ | ✓ |
| Delivery Paths | ✓ | ✓ | ✓ | ✓ |
| Budgets | ✓ | ✓ | ✓ | ✓ |
| Vendors | ✓ | ✓ | ✓ | ✓ |
| Users | ✓ | ✓ | — | — |
| Logs | ✓ | — | — | — |
| Settings | ✓ | — | — | — |

---

## Notes

- All routes require authentication (JWT cookie). The login page is the only public endpoint.
- **contributor** has elevated permissions on projects where they are a PM or SA: they can edit all project data, manage milestones, health statuses, budgets, and assignments, but cannot create new projects or delete any project.
- **guest** is read-only across the board.
- All destructive operations use soft deletes — records are flagged as deleted, not removed from the database.
- Every write operation (create, update, delete) is recorded in the audit log regardless of role.
