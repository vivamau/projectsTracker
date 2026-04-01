# Render.com Setup Summary

## ✅ What Was Done

Your ProjectsTracker is now ready for deployment on Render.com. All necessary files have been created and existing files updated to support Render's managed platform.

## 🔧 Files Created (2)

| File | Purpose |
|------|---------|
| **render.yaml** | Render.com deployment manifest defining two web services (frontend + backend) with persistent disk for SQLite |
| **frontend/docker-entrypoint.sh** | Startup script that runs `envsubst` to substitute `${BACKEND_URL}` into Nginx config at runtime |

## 📝 Files Modified (3)

| File | Change |
|------|--------|
| **frontend/nginx.conf** | Changed `proxy_pass http://backend:5000;` to `proxy_pass ${BACKEND_URL};` (template variable for Render) |
| **frontend/Dockerfile** | Added `gettext` package, template-based Nginx config, entrypoint script support |
| **docker-compose.yml** | Added `BACKEND_URL=http://backend:5000` to frontend environment (maintains Docker Compose compatibility) |

## 🏗️ Architecture for Render

```
Browser → Nginx Frontend (projectstracker-frontend.onrender.com)
  ├─ Serves React SPA static files
  └─ Proxies /api/* → Backend (projectstracker-api.onrender.com)
       ↓
Express Backend (internal, only via proxy)
  ├─ API endpoints
  └─ SQLite Database (persistent 1GB disk)
```

**Why this approach?**
- Cookies use `SameSite=Lax` (authRoutes.js) — won't work cross-domain
- Nginx proxy makes everything appear same-origin to browser
- Authentication (cookie-based JWT) works seamlessly
- No CORS configuration needed

## 📋 render.yaml Structure

**Two Web Services:**

1. **projectstracker-api** (Backend)
   - Runtime: Docker (`backend/Dockerfile`)
   - Port: 5000 (internal)
   - Plan: Starter ($7/month) — required for persistent disk
   - Disk: 1GB at `/app/data` for SQLite
   - Environment:
     - `NODE_ENV=production`
     - `JWT_SECRET` (auto-generated)
     - `JWT_EXPIRES_IN=2h`
     - `CORS_ORIGIN` (auto-set to frontend URL)

2. **projectstracker-frontend** (Frontend)
   - Runtime: Docker (`frontend/Dockerfile`)
   - Port: 80 (public HTTPS)
   - Plan: Starter ($7/month)
   - No disk needed
   - Environment:
     - `BACKEND_URL` (auto-set to backend URL)

**Pricing**: ~$14/month (2 × Starter plan)

## 🚀 How to Deploy

### Step 1: Prepare for Render
```bash
git add render.yaml frontend/docker-entrypoint.sh
git add frontend/nginx.conf frontend/Dockerfile docker-compose.yml
git commit -m "Add Render.com deployment support via render.yaml"
git push origin main
```

### Step 2: Create Render Account
- Go to [render.com](https://render.com)
- Sign up and connect your GitHub repository

### Step 3: Create Blueprint
- Dashboard → Blueprints → New Blueprint
- Select your repository
- Render auto-detects `render.yaml`

### Step 4: Deploy
- Review environment variables
- Click "Create New Group"
- Wait for both services to be **Live** (3-5 minutes)

### Step 5: Test
- Open **projectstracker-frontend** URL
- Login: `admin@projecttracker.it` / `adminpassword`
- Test creating a project → confirm API works

## ✨ Key Features

✅ **Persistent SQLite Data** — Database survives restarts and redeployments  
✅ **Automatic SSL/TLS** — Render provides free HTTPS certificates  
✅ **Auto-Generated Secrets** — JWT_SECRET created securely  
✅ **Service Auto-Discovery** — Frontend automatically finds backend URL  
✅ **Health Checks** — Backend monitored, frontend waits for health before starting  
✅ **Docker Compatible** — Same setup works locally with `docker compose`  
✅ **Easy Updates** — Push to git → automatic rebuild and deploy  

## 🔄 How Service Discovery Works

Render provides service URLs based on names:
- `projectstracker-frontend.onrender.com` (public, HTTPS)
- `projectstracker-api.onrender.com` (public, HTTPS)

In `render.yaml`, we use `fromService` references:
```yaml
# Backend references frontend:
- key: CORS_ORIGIN
  fromService:
    type: web
    name: projectstracker-frontend
    property: hostWithScheme  # → https://projectstracker-frontend.onrender.com

# Frontend references backend:
- key: BACKEND_URL
  fromService:
    type: web
    name: projectstracker-api
    property: hostWithScheme  # → https://projectstracker-api.onrender.com
```

Render resolves these at deploy time automatically.

## 🔒 Security Notes

- ✅ JWT_SECRET auto-generated (cryptographically secure)
- ✅ All traffic is HTTPS (enforced by Render)
- ✅ Cookies are `HttpOnly` and `Secure`
- ✅ Backend only accessible through frontend proxy
- ⚠️ **TODO**: Change default passwords after first login:
  - admin@projecttracker.it → set new password
  - All other default accounts → update passwords

## 🆘 Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Frontend shows "Cannot GET /" | Check frontend logs, verify Dockerfile + entrypoint |
| API calls fail (503/504) | Check backend logs, wait for migrations (40s) |
| Cannot login | Verify CORS_ORIGIN matches frontend URL in backend env |
| Disk quota exceeded | Backend data exceeded 1GB — contact Render to increase |

See **RENDER_DEPLOYMENT.md** for detailed troubleshooting.

## 📚 Documentation

| File | Purpose |
|------|---------|
| **render.yaml** | Render deployment manifest (THIS IS THE KEY FILE) |
| **RENDER_DEPLOYMENT.md** | Complete Render deployment guide (read this!) |
| **DOCKER.md** | Local Docker setup (for development) |
| **DEPLOYMENT.md** | Alternative: self-hosted deployment guide (systemd, PM2) |
| **README.md** | Project overview |

## ⚡ Quick Reference

```bash
# Local development (unchanged):
docker compose up --build -d

# Deploy to Render:
git push origin main  # Render auto-deploys via Blueprint

# Check logs on Render:
# Dashboard → Service → Logs tab

# Update environment variables on Render:
# Dashboard → Service → Environment → Edit

# Monitor disk usage on Render:
# Dashboard → projectstracker-api → Disk → Usage
```

## 🎯 Next Steps

1. **Commit and push** the new files to git
2. **Create Render account** and connect your GitHub repo
3. **Create Blueprint** from `render.yaml`
4. **Deploy** via Render Dashboard
5. **Test** the application with default login credentials
6. **Change passwords** for security (Settings → Users)
7. **Monitor logs** during first deploy to catch any issues
8. **Set up custom domain** (optional, instructions in RENDER_DEPLOYMENT.md)

---

## ✅ Verification Checklist

Before deploying:
- [ ] All files committed to git (`render.yaml`, `docker-entrypoint.sh`, modified Dockerfiles)
- [ ] Docker Compose still works locally: `docker compose up --build -d`
- [ ] No hardcoded localhost URLs in frontend code (axios uses `/api`)
- [ ] Backend `.env.sample` has all required variables

After deploying to Render:
- [ ] Both services show as "Live" in Render Dashboard
- [ ] Frontend URL loads in browser
- [ ] Can login with default credentials
- [ ] API calls succeed (check Network tab in DevTools)
- [ ] Data persists after restart (update a project, restart backend, verify change is still there)

---

## 📞 Support

- **Render Docs**: https://docs.render.com
- **Project Docs**: See RENDER_DEPLOYMENT.md
- **Local Testing**: See DOCKER.md
- **GitHub Issues**: Report bugs in your repo

---

**You're all set!** Deploy your application to Render.com now. 🚀
