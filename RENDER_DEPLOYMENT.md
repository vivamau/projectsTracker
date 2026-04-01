# Render.com Deployment Guide

This guide explains how to deploy ProjectsTracker to [Render.com](https://render.com) using the `render.yaml` manifest.

## Quick Start

### 1. Create Render Account
- Go to [render.com](https://render.com) and create a free account
- Connect your GitHub repository

### 2. Create Render Blueprint
- Navigate to **Dashboard** → **Blueprints**
- Click **New Blueprint**
- Select your GitHub repository
- Render will detect `render.yaml` automatically

### 3. Configure & Deploy
- Review the environment variables (JWT_SECRET will be auto-generated)
- Click **Create New Group** to deploy all services
- Wait for both services to become **Live** (usually 3-5 minutes)

### 4. Test the App
- Click the **projectstracker-frontend** service
- Open the URL (e.g., `https://projectstracker-frontend.onrender.com`)
- Login with: `admin@projecttracker.it` / `adminpassword`

---

## What's Being Deployed

### `render.yaml` Configuration

The `render.yaml` file defines two services:

```
┌─────────────────────────────────────┐
│  Browser                            │
└────────────────┬────────────────────┘
                 │
        ┌────────▼──────────┐
        │  projectstracker- │
        │  frontend         │
        │  (Nginx on port80)│
        │  ┌──────────────┐ │
        │  │ React SPA    │ │
        │  └──────────────┘ │
        │                   │
        │ proxy /api/* →    │
        └────────┬──────────┘
                 │ https://projectstracker-api.onrender.com
        ┌────────▼─────────────────────┐
        │ projectstracker-api          │
        │ (Node.js Express on 5000)    │
        │ ┌────────────────────────┐   │
        │ │ SQLite Database        │   │
        │ │ (Persistent Disk)      │   │
        │ └────────────────────────┘   │
        └──────────────────────────────┘
```

### Service Details

**Frontend Service** (`projectstracker-frontend`)
- Type: Web Service
- Runtime: Docker (frontend/Dockerfile)
- Port: 80 (public HTTPS)
- Region: Oregon (can be changed in render.yaml)
- Plan: Starter
- Environment: `BACKEND_URL` (automatically set to backend service URL)
- No disk needed (stateless)

**Backend Service** (`projectstracker-api`)
- Type: Web Service
- Runtime: Docker (backend/Dockerfile)
- Port: 5000 (internal, not exposed publicly)
- Region: Oregon (matches frontend)
- Plan: Starter (required for persistent disk)
- Disk: 1GB at `/app/data` (stores SQLite database)
- Environment variables:
  - `NODE_ENV=production`
  - `PORT=5000`
  - `DB_PATH=/app/data/database.sqlite`
  - `JWT_SECRET` (auto-generated)
  - `JWT_EXPIRES_IN=2h`
  - `CORS_ORIGIN` (automatically set to frontend service URL)

---

## How Frontend-Backend Communication Works

On Render, the frontend and backend are two separate services with their own URLs:
- Frontend: `https://projectstracker-frontend.onrender.com`
- Backend: `https://projectstracker-api.onrender.com`

The frontend **Nginx server** proxies all `/api/*` requests to the backend:

```
Browser Request: GET https://projectstracker-frontend.onrender.com/api/projects
                           ↓ (Nginx proxy)
                GET https://projectstracker-api.onrender.com/api/projects
```

From the browser's perspective, everything is on the same domain (`projectstracker-frontend.onrender.com`), so:
- ✅ Cookies (`HttpOnly`, `SameSite=Lax`) work correctly
- ✅ CORS is not needed (proxy handles it)
- ✅ API calls include authentication cookies automatically

### Why Nginx Proxy?

The project uses **HttpOnly cookies** for JWT authentication. Cookies set with `SameSite=Lax` are NOT sent on cross-domain requests. If the frontend made direct API calls to a different domain, authentication would fail.

The Nginx proxy ensures all traffic appears to come from the same origin, making cookie-based authentication work seamlessly.

---

## Environment Variables

### Automatically Set by Render

- `JWT_SECRET` — Generated automatically (cryptographically secure)
- `CORS_ORIGIN` — Set to frontend service's public URL
- `BACKEND_URL` — Set to backend service's public URL

### Hardcoded in render.yaml

- `NODE_ENV=production`
- `PORT=5000` (backend)
- `DB_PATH=/app/data/database.sqlite`
- `JWT_EXPIRES_IN=2h`
- `FRONTEND_PORT=80`

### To Change Environment Variables

Edit `render.yaml` and redeploy (or via Render Dashboard Environment Settings):

```yaml
- key: JWT_EXPIRES_IN
  value: 24h  # Change session duration
```

Then commit and push to trigger a redeploy.

---

## Persistent Data

The **SQLite database** persists on a 1GB disk mounted at `/app/data` inside the backend container.

### What This Means

- ✅ Data survives container restarts
- ✅ Database is NOT lost when service stops
- ✅ Each redeploy of the backend container keeps existing data
- ⚠️ Disk size is 1GB — if you exceed this, database writes will fail

### Monitoring Disk Usage

On Render Dashboard:
1. Go to **projectstracker-api** service
2. Open **Disk** → **Usage**

### Backup Strategy

Since this is production data, consider regular backups:

```bash
# Manual backup (if you have console access):
sqlite3 /app/data/database.sqlite ".backup '/backup/db_backup.sqlite'"
```

Render supports manual backups via Dashboard (Premium feature) or you can periodically export data via the API.

---

## Pricing & Limits

### Render Plans

| Plan | Cost | Features |
|------|------|----------|
| Free | $0/month | • No persistent disk<br>• Services sleep after 15 min inactivity<br>• Shared resources |
| Starter | $7/service/month | • Persistent disk support<br>• Services always running<br>• Dedicated resources |

**This deployment uses Starter plan** because SQLite needs persistent disk storage.

### Regional Availability

Services are deployed to `oregon` region. To change:
```yaml
region: us-east  # or other regions: singapore, frankfurt, london, etc.
```

### Bandwidth & Data Transfer

Render includes bandwidth in the plan. Monitor usage via Dashboard to avoid overage charges.

---

## Monitoring

### Check Service Status

In Render Dashboard:
1. Click service name
2. View **Logs** tab for real-time logs
3. View **Events** tab for deployment history
4. View **Metrics** tab for CPU/Memory usage

### Check Health

```bash
# Backend health
curl https://projectstracker-api.onrender.com/health

# Frontend (should return HTML)
curl https://projectstracker-frontend.onrender.com
```

### Enable Notifications

Render Dashboard → Settings → Notifications:
- Email alerts for build failures
- Deployment status alerts

---

## Troubleshooting

### Frontend shows "Cannot GET /"

**Cause**: Nginx container still starting or build failed

**Solution**:
1. Check frontend service logs: Render Dashboard → Logs
2. Verify Dockerfile and entrypoint script are correct
3. Trigger redeploy: push to git → automatic deployment

### API calls return 503 / 504

**Cause**: Backend service not healthy or still initializing

**Solution**:
1. Check backend logs: Render Dashboard → **projectstracker-api** → Logs
2. Look for migration errors (first deploy creates tables)
3. Wait ~40 seconds for migrations to complete (health check timeout)
4. Trigger redeploy if needed

### Authentication fails (cannot login)

**Cause**: Frontend and backend CORS/proxy misconfigured

**Solution**:
1. Open browser DevTools → Network tab
2. Attempt login, check request to `/api/auth/login`
3. Verify request URL is `https://projectstracker-frontend.onrender.com/api/...` (not `api.onrender.com`)
4. Check Set-Cookie header in response (should be present)
5. Check CORS_ORIGIN in backend env matches frontend URL

### Database quota exceeded

**Cause**: SQLite database exceeds 1GB disk size

**Solution**:
1. Export/archive old data
2. Contact Render support to increase disk size

### Service keeps restarting

**Cause**: Application crash or memory limit exceeded

**Solution**:
1. Check logs for error messages
2. Increase plan or optimize database queries
3. Check if migrations are failing on startup

---

## Updating the Application

### Code Changes

When you push to GitHub:
1. Render automatically detects changes
2. Rebuilds Docker images
3. Redeploys services (zero-downtime for frontend, brief downtime for backend)
4. Data persists (SQLite volume is not affected)

### Dependencies

If you add/update `package.json` dependencies:
1. Update `backend/package.json` or `frontend/package.json`
2. Push to git
3. Render will re-run `npm ci` during build
4. Deployment will pick up new versions

### Database Migrations

Migrations run automatically on backend startup via `run_migrations.js`. Any new migrations added to `backend/migrations/` will run when the backend container starts.

---

## Scaling

### Current Setup

Both services run on **Starter plan**:
- 0.5 CPU per service
- 512MB memory per service
- Suitable for small to medium teams

### Scale Up

To handle more users, upgrade in Render Dashboard:

**Backend**:
1. Click **projectstracker-api** → Settings → Plan
2. Upgrade to **Standard** ($25/month) or higher

**Frontend**:
1. Click **projectstracker-frontend** → Settings → Plan
2. Usually Starter is sufficient for frontend (stateless, no database)

Or increase replicas (Pro plan feature) for high availability.

---

## Security Checklist

- ✅ JWT_SECRET is auto-generated (cryptographically secure)
- ✅ HTTPS is enforced by Render (automatically)
- ✅ Cookies are `HttpOnly` and `Secure`
- ✅ CORS is configured for frontend domain only
- ⚠️ Change default admin passwords after first login:
  1. Login as `admin@projecttracker.it`
  2. Go to Settings → Users
  3. Update password for all default accounts

---

## Custom Domain

To use a custom domain (e.g., `app.yourcompany.com`):

1. In Render Dashboard → **projectstracker-frontend** → Settings → Custom Domains
2. Add domain
3. Update your DNS provider's CNAME to point to Render
4. Update `CORS_ORIGIN` in backend env to match frontend domain
5. Render automatically provisions SSL certificate (free)

---

## Support & Resources

- [Render Docs](https://docs.render.com)
- [Render Community](https://community.render.com)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- Project repo: Check DOCKER.md for local development setup

---

## Rollback

If something goes wrong after deployment:

1. **Recent Issue**: Push a fix to git → automatic redeploy
2. **Need to Revert**: Use git to revert commits, push, Render redeploys
3. **Data Loss**: SQLite data is safe (persisted on disk), only code is reverted

There's no manual rollback button, but since everything is in git, you can always revert commits.

---

## Next Steps

1. ✅ Push `render.yaml` to git
2. ✅ Connect repo to Render
3. ✅ Deploy via Render Dashboard
4. ✅ Test login and API calls
5. ✅ Monitor logs for any issues
6. ✅ Set up custom domain if needed
7. ✅ Configure email notifications in Render settings

**You're ready to deploy!** 🚀
