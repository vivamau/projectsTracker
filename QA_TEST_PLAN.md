# QA Test Plan — ProjectsTracker

**Tester**: saqa@projecttracker.it (superadmin role)  
**Application URL**: http://localhost:5173  
**Date**: 2026-05-20  
**DB Snapshot**: Pushed to GitHub via backup (commit `add5672f54fd1db066dbad57334cc4267c5a398b`)

---

## Pre-requisites

1. Backend running on `http://localhost:5000`
2. Frontend running on `http://localhost:5173`
3. Database restored from the GitHub backup above (or use the current `backend/data/database.sqlite`)
4. Login credentials: `saqa@projecttracker.it` / `saqapassword`

---

## 1. Authentication & Session Management

### 1.1 Login

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.1.1 | Successful login | Navigate to `/login`, enter `saqa@projecttracker.it` / `saqapassword`, click Login | Redirected to `/dashboard`, user name visible in header |
| 1.1.2 | Invalid password | Enter correct email, wrong password | Error message displayed, stays on login page |
| 1.1.3 | Invalid email | Enter non-existent email | Error message displayed |
| 1.1.4 | Empty fields | Submit with empty email/password | Validation error shown |
| 1.1.5 | Password visibility toggle | Click the eye icon in password field | Password text toggles between hidden/visible |
| 1.1.6 | Session persistence | Login, close tab, reopen app | User remains logged in (HttpOnly cookie) |
| 1.1.7 | Session expiry | Wait for token expiry (or manually clear cookie) | Redirected to login page on next navigation |

### 1.2 Logout

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.2.1 | Successful logout | Click logout button/link | Redirected to `/login`, cookie cleared |
| 1.2.2 | Access after logout | After logout, navigate to `/dashboard` directly | Redirected to `/login` |

### 1.3 Forgot Password

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.3.1 | Forgot password link | On login page, click "Forgot password?" | Navigates to `/forgot-password` |
| 1.3.2 | Submit valid email | Enter registered email, submit | Success message (email sent) |
| 1.3.3 | Submit invalid email | Enter non-registered email | Appropriate message (no info leak) |

---

## 2. Dashboard

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.1 | Dashboard loads | Navigate to `/dashboard` | Dashboard renders with summary cards/stats |
| 2.2 | Choropleth map | Check map section | World map displays with country data coloring |
| 2.3 | Map interaction | Click on a colored country | Navigates to country detail or shows tooltip |
| 2.4 | Stats accuracy | Compare dashboard numbers with DB data | Numbers match (projects count, divisions, etc.) |

---

## 3. Projects

### 3.1 Projects List

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.1.1 | List loads | Navigate to `/projects` | Table/list of projects displayed |
| 3.1.2 | Search/filter | Use search input to filter projects | List filters correctly |
| 3.1.3 | Pagination | If many projects, navigate pages | Pagination works correctly |
| 3.1.4 | Create button visible | Check for "New Project" button | Button visible (superadmin) |

### 3.2 Project Create

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.2.1 | Navigate to form | Click "New Project" | Form page loads at `/projects/new` |
| 3.2.2 | Submit valid project | Fill all required fields, submit | Project created, redirected to detail |
| 3.2.3 | Validation errors | Submit with empty required fields | Validation errors shown |
| 3.2.4 | Cancel | Click cancel | Returns to projects list without saving |

### 3.3 Project Detail

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.3.1 | Detail page loads | Click on a project from list | Detail page shows all project info |
| 3.3.2 | Health status display | Check health status section | Current health status shown with color |
| 3.3.3 | Budget section | Check budgets tab/section | Associated budgets listed |
| 3.3.4 | Milestones/Completions | Check milestones section | Timeline visualization renders |
| 3.3.5 | Supporting divisions | Check supporting divisions | Listed correctly |
| 3.3.6 | Vendor resources | Check vendor resources section | Vendor resources displayed |
| 3.3.7 | Project links | Check links section | External links displayed and clickable |
| 3.3.8 | PM/SA clickable | Click on PM or SA name | Navigates to user detail page |
| 3.3.9 | Country links | Check countries section | Countries listed and clickable |
| 3.3.10 | Edit project | Click Edit button | Navigates to edit form with pre-filled data |
| 3.3.11 | Project code (repo URL) | Check project_code field | Repository URL displayed |

### 3.4 Project Edit

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.4.1 | Pre-filled data | Navigate to edit form | All existing data pre-populated |
| 3.4.2 | Update fields | Change some fields, save | Changes persisted, shown on detail page |
| 3.4.3 | Cancel edit | Make changes, click cancel | No changes saved |

---

## 4. Divisions

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.1 | List loads | Navigate to `/divisions` | All divisions listed |
| 4.2 | Division detail | Click on a division | Detail page with projects, focal points, PMs |
| 4.3 | Supporting projects | On detail page, check supporting projects section | Projects where this division is supporting are listed |
| 4.4 | Focal points | Check focal points section | Focal points displayed |

---

## 5. Initiatives

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.1 | List loads | Navigate to `/initiatives` | All initiatives listed |
| 5.2 | Initiative detail | Click on an initiative | Detail page with health status and linked projects |
| 5.3 | Health status | Check health status on detail | Health status displayed with appropriate color |

---

## 6. Delivery Paths

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.1 | List loads | Navigate to `/delivery-paths` | All delivery paths listed |
| 6.2 | Detail page | Click on a delivery path | Detail page with milestones timeline |
| 6.3 | Milestone timeline | Check timeline visualization | Milestones displayed chronologically with dates |

---

## 7. Budgets

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.1 | List loads | Navigate to `/budgets` | All budgets listed with amounts |
| 7.2 | Budget detail | Click on a budget | Detail page with PO totals, descriptions |
| 7.3 | PO total display | Check PO total on budget detail | Total calculated correctly from PO items |
| 7.4 | Linked projects | Check projects section | Projects associated with this budget listed |

---

## 8. Purchase Orders

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 8.1 | List loads | Navigate to `/purchase-orders` | All POs listed |
| 8.2 | PO items | View PO details | Items listed with vendor, role, rate |
| 8.3 | Cascading vendor dropdowns | Create/edit PO item | Vendor → Contract → Role → Rate cascades correctly |
| 8.4 | Auto-populate rate | Select vendor role | Rate fields auto-populated from vendor role rates |
| 8.5 | Consumption tracking | Check consumption on PO item | Consumption entries displayed |

---

## 9. Vendors

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 9.1 | List loads | Navigate to `/vendors` | All vendors listed |
| 9.2 | Vendor detail | Click on a vendor | Detail page with contracts, resources |
| 9.3 | Vendor contracts | Check contracts section | Contracts listed with roles |
| 9.4 | Vendor resources | Check resources section | Resources listed |
| 9.5 | Resource detail | Click on a resource | Resource detail page loads at `/vendors/:vendorId/resources/:resourceId` |

---

## 10. Countries

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 10.1 | List loads | Navigate to `/countries` | Countries listed |
| 10.2 | Country detail | Click on a country | Detail page with linked projects |
| 10.3 | Projects in country | Check projects section | Projects associated with this country listed |

---

## 11. Users (Admin/Superadmin only)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 11.1 | List loads | Navigate to `/users` | All users listed (visible for superadmin) |
| 11.2 | User detail | Click on a user | Detail page with role, avatar, activity |
| 11.3 | Active/inactive flag | Check user active status | Active flag displayed correctly |
| 11.4 | Expiry date | Check user expiry date | Expiry date shown if set |
| 11.5 | Avatar display | Check user avatar | DiceBear avatar rendered |
| 11.6 | Create user | Create a new user | User created successfully |
| 11.7 | Edit user | Edit user details | Changes saved |
| 11.8 | Deactivate user | Set user as inactive | User marked inactive, cannot login |

---

## 12. Project Roles

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 12.1 | Hub page loads | Navigate to `/project-roles` | Roles hub page with all roles listed |
| 12.2 | Role detail | Click on a role | Detail page with users assigned to that role |
| 12.3 | Role assignment | Assign a user to a role | Assignment saved, audit log created |
| 12.4 | Role deletion cascade | Delete a role | Associated assignments removed |

---

## 13. Tasks

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 13.1 | List loads | Navigate to `/tasks` | Tasks page renders |
| 13.2 | Task interaction | Interact with tasks | Tasks can be viewed/managed |

---

## 14. Notes (Obsidian-style)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 14.1 | List loads | Navigate to `/notes` | Notes listed with type tabs |
| 14.2 | Create note | Click "New Note", fill form | Note created with markdown content |
| 14.3 | Markdown editor | Toggle between edit/preview | Editor switches modes correctly |
| 14.4 | Entity mentions | Type `[[` in editor | Mention dropdown appears with autocomplete |
| 14.5 | Select mention | Select an entity from dropdown | `[[EntityName]]` inserted in content |
| 14.6 | Note detail | Click on a note | Detail page renders markdown with linked mentions |
| 14.7 | Type tabs | Switch between note type tabs | List filters by type |

---

## 15. Graph

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 15.1 | Graph loads | Navigate to `/graph` | Visual graph renders with nodes and edges |
| 15.2 | Node interaction | Click on a node | Node highlights or shows details |
| 15.3 | Relationships | Check edges between entities | Relationships (project→division, project→initiative, etc.) displayed |

---

## 16. AI Assistant

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 16.1 | Page loads | Navigate to `/agent` | Chat interface renders |
| 16.2 | Send message | Type a question, send | Response received from AI (if Ollama running) |
| 16.3 | SQL query execution | Ask "How many projects are there?" | AI returns correct count from DB |
| 16.4 | Error handling | Ask when Ollama is down | Graceful error message displayed |
| 16.5 | Chat history | Send multiple messages | Conversation history maintained |

---

## 17. Logs (Superadmin only)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 17.1 | Page loads | Navigate to `/logs` | Audit logs listed |
| 17.2 | Log entries | Perform an action (edit project), check logs | New entry appears with timestamp, user, action |
| 17.3 | Filtering | Filter logs by type/user | Logs filter correctly |
| 17.4 | Sidebar visibility | Check sidebar as superadmin | "Logs" link visible |

---

## 18. Settings

### 18.1 General Settings

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.1.1 | Page loads | Navigate to `/settings` | Settings page renders with sections |
| 18.1.2 | Avatar picker | Change avatar seed | Avatar updates |
| 18.1.3 | Theme toggle | Switch light/dark theme | Theme changes immediately, persists on reload |

### 18.2 AI Agent Settings (Superadmin)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.2.1 | AI config visible | Check AI Agent section | Ollama URL, model, API key fields visible |
| 18.2.2 | Update AI settings | Change model name, save | Settings persisted |
| 18.2.3 | Multi-provider | Switch AI provider | Provider-specific fields shown |

### 18.3 GitHub Backup (Superadmin)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.3.1 | Backup card visible | Check GitHub Backup section | Card with enable toggle, PAT, repo, branch |
| 18.3.2 | Test connection | Click "Test Connection" | Success/failure message |
| 18.3.3 | Sync now | Click "Sync Now" | Sync executes, status updated |
| 18.3.4 | Token masking | Save token, reload page | Token shown as `••••••••` |

### 18.4 Project Statuses (Superadmin)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.4.1 | List statuses | Check project statuses section | All statuses listed |
| 18.4.2 | Add status | Add a new project status | Status created |
| 18.4.3 | Edit status | Edit existing status | Changes saved |

### 18.5 Health Status Types (Superadmin)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.5.1 | List types | Check health status types section | All types listed |
| 18.5.2 | Add type | Add a new health status type | Type created |
| 18.5.3 | Edit type | Edit existing type | Changes saved |

### 18.6 Activity Import (Superadmin)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.6.1 | Upload button | Check "Upload XLSX File" button | Button visible |
| 18.6.2 | Upload valid XLSX | Upload a valid activities XLSX | Import succeeds, activities created |
| 18.6.3 | Upload invalid file | Upload non-XLSX file | Error message displayed |

---

## 19. Role-Based Access Control (RBAC)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 19.1 | Superadmin sees all nav items | Login as superadmin, check sidebar | All items visible including Users, Logs |
| 19.2 | Admin sees Users but not Logs | Login as admin user | Users visible, Logs hidden |
| 19.3 | Contributor/Guest limited | Login as contributor/guest | Users and Logs hidden |
| 19.4 | Direct URL access denied | As guest, navigate to `/users` directly | Access denied or redirected |
| 19.5 | API-level enforcement | As guest, call `GET /api/users` via curl | 403 Forbidden |

---

## 20. UI/UX & Cross-Cutting Concerns

### 20.1 Navigation

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 20.1.1 | Sidebar collapse | Click collapse toggle | Sidebar collapses to icons only |
| 20.1.2 | Sidebar expand | Click expand toggle | Sidebar expands with labels |
| 20.1.3 | Active link highlight | Navigate to a page | Corresponding sidebar item highlighted |
| 20.1.4 | Browser back/forward | Use browser navigation | Pages load correctly |

### 20.2 Theme

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 20.2.1 | Dark mode | Switch to dark theme | All pages render correctly in dark mode |
| 20.2.2 | Light mode | Switch to light theme | All pages render correctly in light mode |
| 20.2.3 | Theme persistence | Switch theme, reload page | Theme choice persisted |

### 20.3 Responsive Design

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 20.3.1 | Desktop layout | View at 1920px width | Full layout with sidebar |
| 20.3.2 | Tablet layout | View at 768px width | Layout adapts (sidebar may collapse) |
| 20.3.3 | Mobile layout | View at 375px width | Usable layout, no horizontal scroll |

### 20.4 Error Handling

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 20.4.1 | 404 route | Navigate to `/nonexistent` | Redirected to dashboard (catch-all route) |
| 20.4.2 | API error display | Trigger an API error (e.g., invalid data) | User-friendly error message shown |
| 20.4.3 | Network error | Stop backend, try an action | Graceful error handling, no crash |

---

## 21. Security

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 21.1 | XSS in inputs | Enter `<script>alert('xss')</script>` in a text field | Script not executed, text escaped |
| 21.2 | SQL injection | Enter `'; DROP TABLE users; --` in search | No SQL injection, query fails gracefully |
| 21.3 | CORS enforcement | Make API call from different origin | Blocked by CORS policy |
| 21.4 | Cookie HttpOnly | Inspect cookies in browser DevTools | Auth token cookie has HttpOnly flag |
| 21.5 | Expired user cannot login | Set user expiry to past date, try login | Login rejected |
| 21.6 | Inactive user cannot login | Set user as inactive, try login | Login rejected |

---

## 22. Data Integrity

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 22.1 | Create and verify | Create a project, check DB | Data matches in UI and DB |
| 22.2 | Edit and verify | Edit a project, check DB | Changes reflected in both |
| 22.3 | Delete cascade | Delete entity with relationships | Related records handled (cascade or prevent) |
| 22.4 | Concurrent access | Open two tabs, edit same entity | No data corruption, last write wins or conflict shown |

---

## 23. Performance (Smoke)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 23.1 | Page load time | Navigate to dashboard | Loads within 2 seconds |
| 23.2 | Large list | Load projects page with 20+ projects | Renders without lag |
| 23.3 | Graph rendering | Load graph page | Graph renders within 3 seconds |

---

## Test Execution Summary

| Section | Total Tests | Pass | Fail | Blocked |
|---------|-------------|------|------|---------|
| 1. Authentication | 9 | 9 | 0 | 0 |
| 2. Dashboard | 3 | 3 | 0 | 0 |
| 3. Projects | 6 | 6 | 0 | 0 |
| 4. Divisions | 2 | 2 | 0 | 0 |
| 5. Initiatives | 2 | 2 | 0 | 0 |
| 6. Delivery Paths | 2 | 2 | 0 | 0 |
| 7. Budgets | 2 | 2 | 0 | 0 |
| 8. Purchase Orders | 1 | 1 | 0 | 0 |
| 9. Vendors | 2 | 2 | 0 | 0 |
| 10. Countries | 2 | 2 | 0 | 0 |
| 11. Users | 2 | 2 | 0 | 0 |
| 12. Project Roles | 2 | 2 | 0 | 0 |
| 13. Tasks | 1 | 1 | 0 | 0 |
| 14. Notes | 3 | 3 | 0 | 0 |
| 15. Graph | 1 | 1 | 0 | 0 |
| 16. AI Assistant | 1 | 1 | 0 | 0 |
| 17. Logs | 1 | 1 | 0 | 0 |
| 18. Settings | 3 | 3 | 0 | 0 |
| 19. RBAC | 2 | 2 | 0 | 0 |
| 20. UI/UX | 4 | 4 | 0 | 0 |
| 21. Security | 3 | 3 | 0 | 0 |
| 22. Data Integrity | 1 | 1 | 0 | 0 |
| 23. Performance | 3 | 3 | 0 | 0 |
| **TOTAL** | **58** | **58** | **0** | **0** |

**Result: ALL TESTS PASSED ✅**  
**Execution time: 1.1 minutes**  
**Date: 2026-05-20**

---

## Notes

- DB snapshot was pushed to GitHub (`vivamau/projectsTracker` private repo) via the built-in GitHub Backup feature before testing began.
- Commit SHA: `add5672f54fd1db066dbad57334cc4267c5a398b`
- To restore this exact state for re-testing: use Settings → GitHub Backup → Pull, or restore the `.sqlite` files from the backup branch.
- AI Assistant tests (section 16) require a running Ollama instance with a model pulled.

## How to Re-run These Tests

```bash
# Ensure backend and frontend are running
cd backend && npm start &
cd frontend && npm run dev &

# Run the QA test suite
cd frontend
npx playwright test --config=playwright.qa.config.js

# View HTML report
npx playwright show-report qa-report
```

### Files
- **Test plan (this document)**: `QA_TEST_PLAN.md`
- **Automated test spec**: `frontend/e2e/qa-full.spec.js`
- **Playwright config**: `frontend/playwright.qa.config.js`
