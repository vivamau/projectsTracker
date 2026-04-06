# ProjectsTracker

A full-stack project management application with budget tracking, vendor management, and delivery path planning.

## Stack

- **Frontend**: React 19 + Vite + TailwindCSS
- **Backend**: Node.js 20 + Express.js
- **Database**: SQLite3 (WAL mode for concurrent access)
- **Auth**: JWT + HttpOnly Cookies
- **Deployment**: Docker + Docker Compose

## Quick Start

### With Docker (Recommended for Deployment)

```bash
# Setup environment
cp .env.docker.sample .env

# Build and run
docker compose up --build -d

# Access at http://localhost
```

Default login: `admin@projecttracker.it` / `adminpassword`

See [DOCKER.md](./DOCKER.md) for detailed Docker instructions.

### Local Development (Without Docker)

**Backend:**
```bash
cd backend
npm install
npm start  # runs on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # runs on http://localhost:5173
```

See [CLAUDE.md](./CLAUDE.md) for development guidelines.

## Documentation

- **[DOCKER.md](./DOCKER.md)** — Docker setup, commands, and troubleshooting
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Production deployment (systemd, PM2, reverse proxy)
- **[CLAUDE.md](./CLAUDE.md)** — Development guidelines, testing, and architecture

## Features

- User authentication with role-based access control
- Project and budget management
- Vendor and purchase order tracking
- Division and initiative planning
- Delivery path milestones with timeline visualization
- Supporting divisions for projects
- Activity logging

## Database Initialization

On first run, the backend automatically:
1. Creates/initializes the SQLite database
2. Runs all migrations from `backend/migrations/`
3. Seeds default user roles
4. Seeds default user accounts (if empty)
5. Seeds countries (UN M49 list, 196 entries)
6. Seeds sample/dummy data

### Startup Modes

| Command | Roles | Users | Countries | Dummy Data |
|---------|-------|-------|-----------|------------|
| `node index.js` | ✓ | ✓ | ✓ | ✓ |
| `node index.js nodata` | ✓ | ✓ | ✓ | ✗ |

Use `nodata` for clean production deployments where you want only the essential data without sample projects, budgets, vendors, and other demo content:

```bash
node index.js nodata
```

With PM2, pass it via the ecosystem config:
```js
// ecosystem.config.js
args: 'nodata'
```

Default credentials can be found in [CLAUDE.md](./CLAUDE.md#default-credentials).

## Testing

```bash
# Backend
cd backend
npm test

# Frontend (if configured)
cd frontend
npm test
```

## Environment Configuration

- **Development**: Copy `.env.sample` files in `backend/` and `frontend/`
- **Docker**: Copy `.env.docker.sample` to `.env` in the project root

## Security

- Passwords hashed with bcryptjs
- JWT tokens stored in HttpOnly cookies (XSS protection)
- CORS configured for frontend origin
- Helmet.js for HTTP security headers
- SQLite with foreign keys enforced

## Support

For issues or questions, check the troubleshooting sections in [DOCKER.md](./DOCKER.md) or [DEPLOYMENT.md](./DEPLOYMENT.md).
