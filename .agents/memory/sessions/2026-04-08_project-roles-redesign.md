# Session: Project Roles DB Redesign — 2026-04-08

## Goal
Replace the two hard-coded role table pairs (projectmanagers/solutionarchitects) with a generic, extensible project role assignment model.

## Decision Made
- New `project_roles` lookup table (superadmin-managed, seeded with PM id=1 and SA id=2)
- New `project_assignments` junction table (project + user + role + division + dates + percentage)
- Drop old tables after data migration in migration 026

## Scope of Change
**Backend:** migration 026, new services (projectRoleService, projectAssignmentService), delete old services (projectManagerService, solutionArchitectService), update projectService/userService/projectRoutes, new projectRoleRoutes, update authorizeProjectMember middleware.

**Frontend:** new `/project-roles` admin page, update form.jsx (single dynamic team section), detail.jsx (one card per role), users/detail.jsx, users/index.jsx (act as column), dashboard (dynamic PeopleListCards per role).

**Tests:** delete 4 old test files, create 3 new test files, update 3 existing test files. TDD order: tests first, then implementation.

## Status
Plan approved. Implementation not yet started.
