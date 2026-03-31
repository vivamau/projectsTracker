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
