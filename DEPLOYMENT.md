# ProjectsTracker — Deployment Guide

This document covers production deployment using **PM2 + Nginx** on a Linux server (Ubuntu/Debian). This setup runs Node.js directly on the host, with Nginx acting as a reverse proxy and static file server.

---

## Architecture Overview

```
Browser
   │
   ▼
Nginx (:80 / :443)
   ├── Static files  →  /opt/projectstracker/frontend/dist
   └── /api/*        →  Node.js (PM2) :5000
                            │
                        SQLite DB
                  /opt/projectstracker/backend/data/
```

- **Nginx** handles all inbound HTTP/HTTPS traffic. It serves the compiled React frontend directly from disk and proxies API requests to the backend.
- **PM2** keeps the Node.js backend running, restarts it on crash, and starts it automatically on server reboot.
- **SQLite** stores all data in a single file on the host filesystem.

---

## Prerequisites

Ensure the following are installed on the server before proceeding:

```bash
# Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (global)
sudo npm install -g pm2

# Nginx
sudo apt-get install -y nginx

# Certbot (for HTTPS)
sudo apt-get install -y certbot python3-certbot-nginx
```

Verify versions:
```bash
node --version   # should be v20.x
pm2 --version
nginx -v
```

---

## 1. Clone the Repository

```bash
git clone <repo-url> /opt/projectstracker
cd /opt/projectstracker
```

---

## 2. Install Dependencies

```bash
# Backend — production dependencies only
cd backend && npm install --omit=dev && cd ..

# Frontend — install and build static assets
cd frontend && npm install && npm run build && cd ..
```

The compiled frontend will be output to `frontend/dist/`.

---

## 3. Configure the Backend Environment

```bash
cp backend/.env.sample backend/.env
nano backend/.env
```

Key variables:

| Variable | Example | Notes |
|----------|---------|-------|
| `PORT` | `5000` | Port the API process listens on |
| `JWT_SECRET` | *(random string)* | **Must be changed** — generate with `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `2h` | Session token lifetime |
| `CORS_ORIGIN` | `https://yourdomain.com` | Must match the exact frontend URL (no trailing slash) |
| `NODE_ENV` | `production` | Disables development logging |

Generate a strong JWT secret:
```bash
openssl rand -base64 32
```

---

## 4. Create Required Directories

```bash
mkdir -p /opt/projectstracker/backend/data
mkdir -p /opt/projectstracker/logs
```

The `backend/data/` directory holds the SQLite database file. Ensure the process user has write access.

---

## 5. Start the Backend with PM2

The repository includes an `ecosystem.config.js` at the project root, pre-configured for this setup.

```bash
cd /opt/projectstracker
pm2 start ecosystem.config.js --env production
```

Save the process list and configure PM2 to start on reboot:
```bash
pm2 save
pm2 startup
# Follow the printed command (requires sudo) to register the startup hook
```

Verify the process is running:
```bash
pm2 status
pm2 logs projectstracker-api
```

### Starting Without Seed Data

For a clean production start with no sample data (only default users, roles, and countries are seeded):

```bash
# Edit ecosystem.config.js to pass 'nodata':
#   args: 'nodata'
pm2 start ecosystem.config.js --env production
```

Or pass it directly:
```bash
cd backend && NODE_ENV=production node index.js nodata
```

---

## 6. Configure Nginx

Create the site configuration:

```bash
sudo nano /etc/nginx/sites-available/projectstracker
```

Paste the following, replacing `yourdomain.com` with your actual domain:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve the compiled React frontend
    root /opt/projectstracker/frontend/dist;
    index index.html;

    # SPA fallback — client-side routes return index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy all API and Swagger requests to the Node.js backend
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/projectstracker /etc/nginx/sites-enabled/
sudo nginx -t          # test configuration syntax
sudo systemctl reload nginx
```

---

## 7. Enable HTTPS with Certbot

Once your domain's DNS points to the server, obtain a certificate and let Certbot update the Nginx config automatically:

```bash
sudo certbot --nginx -d yourdomain.com
```

Certbot adds SSL directives and sets up automatic HTTP → HTTPS redirection. Certificates renew automatically via a systemd timer or cron job.

Verify auto-renewal:
```bash
sudo certbot renew --dry-run
```

---

## Deploying Updates

```bash
cd /opt/projectstracker

# Pull latest code
git pull origin main

# Rebuild the frontend
cd frontend && npm install && npm run build && cd ..

# Install any new backend dependencies
cd backend && npm install --omit=dev && cd ..

# Restart the API process
pm2 restart projectstracker-api

# Reload Nginx if the config changed
sudo nginx -t && sudo systemctl reload nginx
```

---

## Database Backup and Restore

The SQLite database lives at `backend/data/database.sqlite`. Back it up by copying the file while the application is idle, or use SQLite's online backup command.

### Backup

```bash
# Simple file copy (safe when the app is stopped or traffic is low)
cp /opt/projectstracker/backend/data/database.sqlite \
   /backups/projectstracker_$(date +%Y-%m-%d_%H-%M-%S).sqlite

# Online backup using the SQLite CLI (safe while the app is running)
sqlite3 /opt/projectstracker/backend/data/database.sqlite \
  ".backup '/backups/projectstracker_$(date +%Y-%m-%d_%H-%M-%S).sqlite'"
```

### Restore

```bash
pm2 stop projectstracker-api
cp /backups/projectstracker_<timestamp>.sqlite \
   /opt/projectstracker/backend/data/database.sqlite
pm2 start projectstracker-api
```

---

## Monitoring

### Application Health

```bash
# API health endpoint
curl http://localhost:5000/health

# Via Nginx (if configured)
curl https://yourdomain.com/api/health
```

### PM2 Process Management

```bash
pm2 status                                   # list all processes and their state
pm2 logs projectstracker-api                 # tail live logs
pm2 logs projectstracker-api --lines 200     # show last 200 lines
pm2 restart projectstracker-api              # restart the process
pm2 reload projectstracker-api               # graceful reload (zero downtime)
pm2 stop projectstracker-api                 # stop without removing
pm2 delete projectstracker-api               # remove from PM2
pm2 monit                                    # real-time CPU and memory dashboard
```

### Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Security Checklist

Before going live, verify the following:

- [ ] `JWT_SECRET` is set to a unique random string (at minimum 32 characters)
- [ ] `CORS_ORIGIN` is set to your production domain with the correct scheme (`https://`)
- [ ] Default admin credentials have been changed in the application
- [ ] HTTPS is active and HTTP redirects to HTTPS
- [ ] `NODE_ENV=production` is set in the backend environment
- [ ] The `backend/data/` directory is not publicly accessible via Nginx
- [ ] A regular database backup schedule is in place
- [ ] Nginx is configured to hide its version (`server_tokens off` in `nginx.conf`)

---

## Rollback

If an update introduces a problem:

```bash
# 1. Revert to the previous commit
cd /opt/projectstracker
git log --oneline -5       # identify the last stable commit
git checkout <commit-hash>

# 2. Rebuild the frontend
cd frontend && npm install && npm run build && cd ..

# 3. Reinstall backend dependencies
cd backend && npm install --omit=dev && cd ..

# 4. Restart
pm2 restart projectstracker-api

# 5. Restore the database if the new code ran a breaking migration
pm2 stop projectstracker-api
cp /backups/projectstracker_<pre-update-timestamp>.sqlite \
   /opt/projectstracker/backend/data/database.sqlite
pm2 start projectstracker-api
```

---

## Troubleshooting

### API returns 502 Bad Gateway

The Nginx proxy cannot reach the backend. Check that PM2 is running and listening on the configured port:

```bash
pm2 status
curl http://localhost:5000/health
```

If the process is stopped, start it:
```bash
pm2 start projectstracker-api
```

### Frontend shows a blank page or 404 on refresh

The SPA fallback is not configured. Verify that the `location /` block in the Nginx config includes `try_files $uri $uri/ /index.html`.

### Port already in use on startup

Another process is using port 5000. Find and stop it, or change `PORT` in `backend/.env` and update the `proxy_pass` address in the Nginx config accordingly:

```bash
sudo lsof -i :5000
```

### PM2 process keeps restarting

Check the error logs for the root cause:
```bash
pm2 logs projectstracker-api --err --lines 50
```

Common causes: missing `backend/.env`, incorrect `PORT`, database file permission error.

### Nginx configuration test fails

```bash
sudo nginx -t
```

Read the error output carefully — it will point to the exact line and file with the issue.

---

## Support

- Review the troubleshooting section above
- Check [GitHub Issues](https://github.com/yourusername/projectsTracker/issues)
- Contact the development team
