# Technology Stack & Commands

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, TailwindCSS 4, React Router 7 |
| Backend | Node.js 20, Express.js 4 |
| Database | SQLite3 (WAL mode, single-instance writes) |
| Auth | JWT stored in HttpOnly cookies, bcryptjs for hashing |
| Testing | Jest + Supertest (backend), Playwright (frontend E2E) |
| Process Manager | PM2 (production) |
| Deployment | Docker + Docker Compose, or systemd + Nginx |

## Key Libraries

### Backend
- `express` — HTTP framework
- `sqlite3` — Database driver
- `jsonwebtoken` / `bcryptjs` — Auth
- `helmet` / `cors` / `cookie-parser` — Security & middleware
- `morgan` — Request logging
- `swagger-ui-express` / `yamljs` — API docs
- `@toolbox-sdk/core` / `@toolbox-sdk/server` — AI agent MCP integration

### Frontend
- `axios` — HTTP client (configured with `withCredentials: true`)
- `lucide-react` — Icons
- `recharts` — Charts and data visualization
- `react-leaflet` / `leaflet` — Maps
- `react-markdown` / `remark-gfm` — Markdown rendering

## Common Commands

### Backend

```bash
cd backend
npm install          # Install dependencies
npm start            # Start server (port 5000)
npm run dev          # Start with nodemon (hot reload)
npm test             # Run tests with coverage (Jest)
npm run test:watch   # Watch mode
```

### Frontend

```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Dev server (port 5173)
npm run build        # Production build
npm run lint         # ESLint
npm run test:e2e     # Playwright E2E tests (headless)
npm run test:e2e:headed  # Playwright E2E (visible browser)
```

### Production (PM2)

```bash
pm2 start ecosystem.config.js --env production
pm2 restart projectstracker-api
pm2 logs projectstracker-api
```

## Testing Requirements

- Backend coverage threshold: **85%** (branches, functions, lines, statements)
- All new files and features require unit tests
- API endpoints require integration tests with supertest
- Critical user flows require E2E tests with Playwright
- TDD approach: write tests first, then implementation
- On failure: fix the code, not the tests

## Database

- SQLite3 in WAL mode for concurrent reads
- Single-instance writes only (no clustering)
- Migrations in `backend/migrations/` — use `IF NOT EXISTS` for idempotency
- Auto-initialized on backend startup (migrations → seed roles → seed users → seed countries)
- Start with `node index.js nodata` to skip sample data seeding
