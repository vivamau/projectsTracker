# Docker Setup for ProjectsTracker

This guide covers building, running, and managing ProjectsTracker using Docker.

## What's Included

The Docker setup includes:

- **backend/Dockerfile** — Node.js 20 Alpine container running Express API
- **frontend/Dockerfile** — Multi-stage build: Vite → Nginx Alpine for serving React SPA
- **frontend/nginx.conf** — Nginx configuration with SPA routing and API proxy
- **docker-compose.yml** — Orchestrates both services with a persistent SQLite volume
- **.env.docker.sample** — Environment configuration template
- **DEPLOYMENT.md** — Full deployment guide for production

## Quick Start

### 1. Setup Environment

```bash
# Copy the sample env file
cp .env.docker.sample .env

# Edit as needed (JWT secret, CORS origin, etc)
# For local dev, defaults are usually fine
```

### 2. Build & Run

```bash
# Build images
docker compose build

# Start services (detached)
docker compose up -d

# View logs
docker compose logs -f
```

### 3. Access the App

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **Health Check**: http://localhost/api/health

Default credentials: `admin@projecttracker.it` / `adminpassword`

## Architecture Overview

```
┌──────────────────────────────────────┐
│  Browser / Client                    │
└────────────────┬─────────────────────┘
                 │ HTTP/HTTPS
                 ▼
        ┌─────────────────────┐
        │  Nginx (port 80)    │
        │  Serves React SPA   │
        │  Proxies /api/* →   │
        └──────────┬──────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
    Static Files        API Calls
    (dist/)             (/api/*)
         │                    │
    ▼ (try_files)      ▼ (proxy_pass)
    index.html         backend:5000
                        │
                        ▼
            ┌───────────────────────┐
            │ Node.js (port 5000)   │
            │ Express API           │
            │ - Auth                │
            │ - CRUD Operations     │
            │ - DB Queries          │
            └───────┬───────────────┘
                    │
                    ▼ (mounts)
            ┌───────────────────────┐
            │  SQLite Database      │
            │  (db_data volume)     │
            │  Persists across      │
            │  container restarts   │
            └───────────────────────┘
```

## File Descriptions

### `backend/Dockerfile`
- Base: `node:20-alpine` (lightweight Linux)
- Installs only production dependencies (`npm ci --omit=dev`)
- Runs as non-root `node` user for security
- Exposes port 5000 (internal only, not exposed to host)

### `frontend/Dockerfile`
- **Stage 1 (builder)**: Builds React app with Vite
- **Stage 2 (runner)**: Nginx Alpine to serve built assets
- Accepts `VITE_API_URL` build arg (currently unused, frontend uses relative `/api` paths)
- Exposes port 80 (served by Nginx)

### `frontend/nginx.conf`
- Routes `/api` requests to backend service: `proxy_pass http://backend:5000`
- Serves static assets with cache headers
- Implements SPA routing: non-existent routes serve `index.html`
- Compresses responses with Gzip

### `docker-compose.yml`
- Defines two services: `backend` and `frontend`
- Backend depends on health check before frontend starts
- Named volume `db_data` mounts to `/app/data` in backend
- Both services configured with `restart: unless-stopped`
- Environment variables passed from `.env` file

## Common Commands

```bash
# View running containers
docker compose ps

# Start services
docker compose up -d

# Stop services (keep data)
docker compose down

# Stop and remove all data
docker compose down -v

# View logs
docker compose logs -f              # All services
docker compose logs -f backend      # Specific service
docker compose logs -f --tail 100   # Last 100 lines

# Restart service
docker compose restart backend
docker compose restart frontend

# Execute command in container
docker compose exec backend npm test
docker compose exec backend node -e "console.log(process.env)"

# Rebuild after code changes
docker compose up -d --build
```

## Environment Variables

See `.env.docker.sample` for all options. Key variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `JWT_SECRET` | Token signing secret | `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | Token expiration | `2h` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost` or `https://yourdomain.com` |
| `FRONTEND_PORT` | Host port for frontend | `80`, `8080`, `3000` |

## Database Persistence

The SQLite database is stored in a Docker named volume, automatically persisted across restarts:

```bash
# List all volumes
docker volume ls | grep projectstracker

# Backup database
docker run --rm -v projectstracker_db_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/db_backup.tar.gz -C /data .

# Inspect volume location
docker volume inspect projectstracker_db_data
```

## Development vs Production

### Local Development

```bash
# Use defaults
cp .env.docker.sample .env
FRONTEND_PORT=8080 docker compose up -d
# Access: http://localhost:8080
```

### Production

```bash
# Security-critical changes to .env:
JWT_SECRET=<strong-random-string>     # Change this!
CORS_ORIGIN=https://yourdomain.com    # Your domain
FRONTEND_PORT=80                       # Standard HTTPS port (behind reverse proxy)

# Use systemd or PM2 to manage the stack
# See DEPLOYMENT.md for full production setup
```

## Troubleshooting

### Frontend shows "Cannot GET /"
```bash
docker compose logs frontend
docker compose restart frontend
```

### API calls fail (503 / 504)
```bash
docker compose logs backend
docker compose restart backend
# Verify: docker compose exec frontend curl http://backend:5000/health
```

### Port already in use
```bash
# Change FRONTEND_PORT in .env
FRONTEND_PORT=8080 docker compose up -d
```

### Database not persisting
```bash
# Check volume exists
docker volume ls | grep projectstracker

# Check mount in backend
docker inspect projectstracker-backend | grep -A 5 Mounts

# Recreate if needed
docker volume rm projectstracker_db_data
docker compose up -d
```

### Container keeps restarting
```bash
# Check logs and increase health check timeout if needed
docker compose logs backend
# Edit docker-compose.yml: start_period: 60s (or higher)
```

## Network Diagram

```
Host Machine          Docker Network          Container Ports
─────────────────────────────────────────────────────────────
localhost:80   ──────────┐
               │
               │          Nginx Container
               │          ├─ :80 (internal)
               └─────────→├─ routes /api → backend:5000
                          └─ serves static files

                          Backend Container
                          ├─ :5000 (internal)
                          └─ connects to db_data volume
```

## Security Notes

⚠️ **Important for Production:**

1. Change `JWT_SECRET` to a strong random value
2. Set `CORS_ORIGIN` to your actual domain
3. Use HTTPS in front of the Nginx container (reverse proxy with certbot/Let's Encrypt)
4. Use strong passwords for all default accounts
5. Regularly backup the SQLite database
6. Keep Docker and base images updated

## Next Steps

1. **Run locally**: `docker compose up -d`
2. **Deploy to server**: See `DEPLOYMENT.md`
3. **Monitor in production**: Use container logs and healthchecks
4. **Scale up**: Add PM2, systemd, or Kubernetes orchestration

## Support

- Review logs: `docker compose logs -f`
- Check health: `curl http://localhost/api/health`
- Full deployment guide: See `DEPLOYMENT.md`
