# Project Structure

Monorepo with separate `backend/` and `frontend/` directories. No shared workspace package.json at root.

```
projectsTracker/
├── backend/                  # Express.js API server
│   ├── config/               # Database connection configs
│   ├── data/                 # SQLite database files (gitignored)
│   ├── middleware/           # Express middleware (auth, etc.)
│   ├── migrations/           # SQL migration files (001_initial.sql, ...)
│   ├── migration_scripts/    # JS scripts that run migrations
│   ├── routes/               # Express route handlers
│   ├── scripts/              # Seed scripts (users, roles, countries, data)
│   ├── services/             # Business logic layer (one file per domain)
│   ├── tests/                # Jest tests mirroring source structure
│   │   ├── helpers/          # Test utilities and mocks
│   │   ├── routes/           # Route integration tests
│   │   ├── services/         # Service unit tests
│   │   └── utilities/        # Utility unit tests
│   ├── utilities/            # Shared helpers (validation, dates, responses)
│   ├── index.js              # App entry point
│   ├── swagger.yaml          # API documentation
│   └── tools.yaml            # MCP Toolbox tool definitions
│
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── api/              # Axios API client modules
│   │   ├── assets/           # Static assets
│   │   ├── commoncomponents/ # Shared/reusable UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── layouts/          # Page layout wrappers
│   │   └── pages/            # Page modules (feature-based)
│   │       └── {feature}/    # Each feature folder contains:
│   │           ├── index.jsx       # Page entry component
│   │           ├── components/     # Feature-specific components
│   │           └── tests/          # Feature-specific tests
│   ├── index.html
│   └── vite.config.js
│
├── docs/                     # Additional documentation
├── ecosystem.config.js       # PM2 production config
├── CLAUDE.md                 # Development guidelines
├── DEPLOYMENT.md             # Production deployment guide
└── rolematrix.md             # Role-based access control matrix
```

## Architecture Pattern

- **Backend**: Routes → Services → Database (SQLite via raw SQL)
  - Routes handle HTTP concerns (request parsing, response formatting)
  - Services contain business logic and database queries
  - One service file per domain entity (e.g., `projectService.js`, `vendorService.js`)
  - Utilities for cross-cutting concerns (validation, date formatting, audit)

- **Frontend**: Pages → Components → API modules → Hooks
  - Feature-based page organization (each page folder is self-contained)
  - Shared components live in `commoncomponents/`
  - API calls centralized in `src/api/` modules
  - Custom hooks in `src/hooks/` for reusable stateful logic

## Naming Conventions

- Backend files: camelCase (e.g., `projectService.js`, `authRoutes.js`)
- Frontend pages: lowercase folder names matching the domain (e.g., `projects/`, `vendors/`)
- Frontend components: PascalCase `.jsx` files
- Tests: `{name}.test.js` in the corresponding `tests/` directory
- Migrations: numbered prefix `NNN_description.sql`
