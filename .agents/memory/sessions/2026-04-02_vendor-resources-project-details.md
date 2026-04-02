# Add Vendor Resources to Project Details Page

**Date**: 2026-04-02
**Status**: In Progress

## Goal
Add vendor's resources to the project details page sidebar, under the Project Managers card.

## User Requirements
- Display: Resource name + vendor name + role
- Capability: View + link/unlink (admin)
- Location: Right sidebar, after Project Managers

## Changes Made

### Backend
1. **`backend/services/vendorResourceService.js`** - Added `getByProjectId(db, projectId)` function
   - Queries vendor resources via: purchaseorderitems → purchaseorders → budgets → projects_to_budgets
   - Joins vendorresources, vendors, vendorcontractroles
   - Returns distinct resources sorted by vendor_name, resource_lastname, resource_name
   - Filters out soft-deleted records

2. **`backend/routes/projectRoutes.js`** - Added `GET /:id/vendor-resources` route
   - Requires authentication
   - Calls vendorResourceService.getByProjectId

### Frontend
3. **`frontend/src/api/projectsApi.js`** - Added `getVendorResources(projectId)` API function

4. **`frontend/src/pages/projects/detail.jsx`** - Added Vendor Resources card
   - Fetches vendor resources in useEffect alongside other data
   - New Card in sidebar after Project Managers
   - Shows avatar (initials), name, vendor, role, email
   - Orange avatar color (warning-50/warning-600) to distinguish from PMs
   - Empty state: "No vendor resources assigned"

### Tests
5. **`backend/tests/services/vendorResourceService.test.js`** - Added getByProjectId test suite
   - Tests empty project returns empty array
   - Tests resources linked via PO items
   - Tests vendor contract role inclusion
   - Tests no duplicate resources
   - Tests expected fields in response

6. **`backend/tests/routes/projectRoutes.test.js`** - Added vendor-resources route tests
   - Tests empty project response
   - Tests 401 for unauthenticated requests

### Frontend Tests
- Skipped: No frontend testing framework configured (no Jest/Vitest in package.json)

## Data Flow
```
Project → projects_to_budgets → Budgets → Purchase Orders → Purchase Order Items → Vendor Resources
                                                                          ↓→ Vendor Contract Roles
                                     Purchase Orders → Vendors
```

## Notes
- No database migrations needed - uses existing schema
- Vendor resources are linked to projects indirectly through purchase order items
