# Implementation Status

## Backend
- **32 test suites, 442 tests, all passing; 85%+ coverage**
- 13 services: auth, user, project, division, country, currency, healthStatus, initiative, deliveryPath, completion, budget, purchaseOrder, purchaseOrderItem, focalPoint
- 9 route files: auth, projects (includes health-statuses + completions + budgets + project-managers), divisions (includes focal-points + projects + project-managers), budgets (includes purchase-orders + purchase-order items), users, countries, currencies, initiatives, deliveryPaths
- 10 migrations: initial schema, auth+soft-delete, completions project FK, projectmanagers division FK, PM junction division, vendors, PO + items, PO soft delete, vendor soft delete, PO items soft delete
- 3 seed scripts: userroles, users, dummy_data (divisions, initiatives, delivery paths, projects, health statuses, completions, budgets, country links, PM assignments, focal points)

## Frontend
- Login, Dashboard (KPI + health chart + recent projects)
- Projects: list, detail (milestones, budgets, PMs with division, health timeline, countries), create/edit form (PM with division dropdown per user)
- Divisions: list (links to detail), detail (projects table, focal points with add/remove, PMs grouped by user, total budget, metadata)
- Budgets: detail page with purchase orders table, create/edit PO modals with vendor dropdown
- Purchase Orders: inline items management via PoItemsModal — nested modal for item CRUD (description, dates, days, discounted_rate, currency)
- Vendors: list page with CRUD, vendor information (name, email, phone, address, website)
- Initiatives, Delivery Paths, Users, Settings
- Shared components: Sidebar, Header, Card, Modal, ConfirmDialog, StatusBadge, Pagination, SearchInput, LoadingSpinner, ProtectedRoute
- Custom pages: PoItemsModal.jsx (self-contained PO items management)
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
| `/api/users` | CRUD | superadmin |
| `/api/countries` | GET | any |
| `/api/initiatives` | CRUD | admin+ |
| `/api/deliverypaths` | CRUD | admin+ |
