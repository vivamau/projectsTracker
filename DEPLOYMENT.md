# ProjectsTracker Deployment Guide

This document provides comprehensive instructions for deploying ProjectsTracker using Docker.

## Quick Start (Development)

```bash
# 1. Clone and setup
git clone <repo-url>
cd projectsTracker

# 2. Configure environment
cp .env.docker.sample .env

# 3. Build and run
docker compose up --build

# 4. Access the app
open http://localhost
```

Default credentials: `admin@projecttracker.it` / `adminpassword`

---

## Docker Architecture

```
┌─────────────────────────────────────────┐
│         Browser / Client                 │
└──────────────────┬──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Nginx Frontend :80  │
        │  (React + Vite)      │
        └──────────┬───────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    ▼ (SPA)           ▼ (/api proxy)
   dist/          backend:5000
 Static files   ┌──────────────────────┐
                │ Node.js Backend      │
                │ (Express API)        │
                │ SQLite DB            │
                └────────┬─────────────┘
                         │
                    ▼ (Volume)
                 db_data volume
                (Persistent SQLite)
```

### Components

- **Frontend Container**: Nginx serving React SPA build, proxies `/api/*` to backend
- **Backend Container**: Node.js Express server running on internal port 5000
- **Database Volume**: Named volume `db_data` mounted at `/app/data` for SQLite persistence

---

## Environment Configuration

### Create `.env` File

Copy `.env.docker.sample` to `.env` and adjust as needed:

```bash
cp .env.docker.sample .env
```

### Key Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | `change-this-...` | **⚠️ MUST change in production** |
| `JWT_EXPIRES_IN` | `2h` | Session token expiration |
| `CORS_ORIGIN` | `http://localhost` | Allowed frontend origin |
| `FRONTEND_PORT` | `80` | Host port for Nginx (e.g., `8080` to avoid conflicts) |
| `VITE_API_URL` | `` (empty) | API URL for frontend (leave empty for proxy) |

### Production Configuration

```bash
# .env (Production)
JWT_SECRET=<generate-strong-random-string>
CORS_ORIGIN=https://yourdomain.com
FRONTEND_PORT=80
```

To generate a strong JWT secret:
```bash
openssl rand -base64 32
```

---

## Running with Docker Compose

### Build Images

```bash
# Build both backend and frontend images
docker compose build
```

### Start Services

```bash
# Start all services (detached mode)
docker compose up -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
```

### Stop Services

```bash
# Stop all services (keep data)
docker compose down

# Stop and remove volumes (clean wipe)
docker compose down -v
```

### Restart Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend
```

---

## Data Persistence

The SQLite database is persisted in a Docker named volume (`db_data`).

### Backup Database

```bash
# Create a backup of the database
docker run --rm -v projectstracker_db_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/db_backup_$(date +%s).tar.gz -C /data .
```

### Restore Database

```bash
# Restore from backup
docker run --rm -v projectstracker_db_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/db_backup_<timestamp>.tar.gz -C /data
```

### View Database Location

```bash
# Inspect the volume to find its actual filesystem location
docker volume inspect projectstracker_db_data

# Example output shows: "Mountpoint": "/var/lib/docker/volumes/projectstracker_db_data/_data"
```

---

## Troubleshooting

### Frontend Shows "Cannot GET /"

**Cause**: Frontend container not running or Nginx misconfigured.

**Solution**:
```bash
docker compose logs frontend
docker compose restart frontend
```

### API calls return 503 / Cannot reach backend

**Cause**: Backend container not healthy or Nginx proxy misconfigured.

**Solution**:
```bash
# Check backend health
docker compose logs backend

# Verify backend is running
docker compose ps

# Test backend connectivity
docker exec projectstracker-frontend curl http://backend:5000/health
```

### Database file not persisting

**Cause**: Volume not properly mounted or removed.

**Solution**:
```bash
# List volumes
docker volume ls | grep projectstracker

# Check volume mount in backend container
docker inspect projectstracker-backend | grep -A 5 Mounts

# If needed, recreate the volume
docker volume rm projectstracker_db_data
docker compose up --build
```

### Port already in use (Error: bind: address already in use)

**Cause**: Another service running on port 80 (or configured FRONTEND_PORT).

**Solution**:
```bash
# Option 1: Change the port in .env
# FRONTEND_PORT=8080

# Option 2: Kill the process using port 80 (Linux/Mac)
sudo lsof -i :80
sudo kill -9 <PID>

# Option 3: Use a different port
docker compose up -d -p 8080:80
```

### Container keeps restarting

**Cause**: Application crash or health check failure.

**Solution**:
```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Increase health check timeout in docker-compose.yml if migrations take long
# Adjust `start_period: 40s` if needed
```

---

## Production Deployment

### On Ubuntu/Debian Server

1. **Install Docker & Docker Compose**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose
   sudo usermod -aG docker $USER
   ```

2. **Clone repository**:
   ```bash
   git clone <repo-url> /opt/projectstracker
   cd /opt/projectstracker
   ```

3. **Configure environment**:
   ```bash
   cp .env.docker.sample .env
   nano .env  # Edit JWT_SECRET, CORS_ORIGIN, etc.
   ```

4. **Start services**:
   ```bash
   docker compose up -d
   ```

5. **Setup Nginx reverse proxy** (optional, for multiple apps on one server):
   See "Reverse Proxy Setup" section below.

### Using PM2 for Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'projectstracker',
    script: 'docker-compose',
    args: 'up',
    cwd: '/opt/projectstracker',
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Using systemd (Recommended)

Create `/etc/systemd/system/projectstracker.service`:

```ini
[Unit]
Description=ProjectsTracker Application
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/projectstracker
ExecStart=/usr/bin/docker compose up
ExecStop=/usr/bin/docker compose down
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable projectstracker.service
sudo systemctl start projectstracker.service
sudo systemctl status projectstracker.service
```

### Reverse Proxy Setup (Nginx)

If you have other services on the same server, use Nginx as a reverse proxy:

```nginx
# /etc/nginx/sites-available/projectstracker
upstream projectstracker {
    server localhost:80;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.crt;
    ssl_certificate_key /path/to/key.key;

    location / {
        proxy_pass http://projectstracker;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

Enable and test:
```bash
sudo ln -s /etc/nginx/sites-available/projectstracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Monitoring

### Check Application Health

```bash
# Backend health
curl http://localhost/api/health

# Frontend (should return HTML)
curl http://localhost
```

### View Container Metrics

```bash
# Real-time stats
docker stats

# Memory usage
docker compose exec backend ps aux
```

### Logs Aggregation

```bash
# View all logs with timestamps
docker compose logs --timestamps

# Follow live logs
docker compose logs -f

# Specific service
docker compose logs -f backend --tail 100
```

---

## Security Checklist

- [ ] Change `JWT_SECRET` to a random 32+ character string
- [ ] Set `CORS_ORIGIN` to your production domain (HTTPS)
- [ ] Use strong passwords for default admin accounts
- [ ] Enable HTTPS on your reverse proxy / load balancer
- [ ] Run Docker daemon as non-root (already configured in Dockerfiles)
- [ ] Keep Docker and base images updated
- [ ] Regularly backup the SQLite database volume
- [ ] Monitor logs for suspicious activity

---

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild images with latest code
docker compose build

# Stop old containers and start new ones
docker compose up -d

# View logs to ensure startup was successful
docker compose logs -f
```

---

## Rollback

```bash
# If something goes wrong, rollback to previous deployment:

# 1. Stop current services
docker compose down

# 2. Revert code changes
git revert HEAD

# 3. Rebuild and restart
docker compose up --build -d

# Note: Database data persists in the volume, so no data is lost
```

---

## Support

For issues or questions:
1. Check logs: `docker compose logs`
2. Review troubleshooting section above
3. Check [GitHub Issues](https://github.com/yourusername/projectsTracker/issues)
4. Contact the development team
