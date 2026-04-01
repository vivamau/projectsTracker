# Render.com Deployment Guide - Free Tier (Docker Services)

Welcome! This folder contains everything you need to deploy ProjectsTracker to Render.com using the free tier with manual Docker service setup.

## 📁 Files in This Folder

| File | Purpose |
|------|---------|
| **README.md** | This file - overview and navigation |
| **FREE_TIER_OVERVIEW.md** | What's included, what's limited on free tier |
| **MANUAL_DOCKER_SETUP.md** | Step-by-step UI instructions for creating Docker services manually |
| **DOCKER_SERVICE_SETUP_BACKEND.md** | Detailed setup for backend service |
| **DOCKER_SERVICE_SETUP_FRONTEND.md** | Detailed setup for frontend service |
| **QUICK_REFERENCE.md** | Quick checklist and commands |
| **TROUBLESHOOTING.md** | Common issues and fixes |
| **UPGRADE_TO_STARTER.md** | How to add persistent disk and upgrade to Starter tier |

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Render.com free account (create at [render.com](https://render.com))
- GitHub repository with ProjectsTracker code pushed
- This folder's instructions open and ready

### Step 1: Create Backend Service
1. Read: **DOCKER_SERVICE_SETUP_BACKEND.md**
2. Follow: Click-by-click instructions
3. Wait: Backend deploys (~2 min)

### Step 2: Get Backend URL
1. Open backend service in Render Dashboard
2. Copy the public URL (e.g., `https://projectstracker-api.onrender.com`)

### Step 3: Create Frontend Service
1. Read: **DOCKER_SERVICE_SETUP_FRONTEND.md**
2. Enter: Backend URL from Step 2 in `BACKEND_URL` env var
3. Wait: Frontend deploys (~2 min)

### Step 4: Test
1. Open frontend URL in browser
2. Login: `admin@projecttracker.it` / `adminpassword`
3. Create a project → Verify API works ✅

**Done!** Your app is live. 🎉

---

## 📖 Read These Files

**First Time?** Read in this order:

1. **FREE_TIER_OVERVIEW.md** (2 min)
   - What you get, what's limited
   - Architecture overview
   - Free vs Starter comparison

2. **MANUAL_DOCKER_SETUP.md** (5 min)
   - Why manual setup instead of Blueprints
   - High-level process
   - What to expect

3. **DOCKER_SERVICE_SETUP_BACKEND.md** (10 min)
   - Exact steps to create backend service
   - Environment variables to set
   - Troubleshooting

4. **DOCKER_SERVICE_SETUP_FRONTEND.md** (10 min)
   - Exact steps to create frontend service
   - How to connect to backend
   - Testing

5. **TROUBLESHOOTING.md** (if needed)
   - Common errors and fixes

**Quick Deploy?** Just read:
- **QUICK_REFERENCE.md**
- **DOCKER_SERVICE_SETUP_BACKEND.md**
- **DOCKER_SERVICE_SETUP_FRONTEND.md**

---

## 🏗️ Architecture on Render Free Tier

```
┌─────────────────────────────────┐
│   Your Computer / GitHub        │
│   (ProjectsTracker code)        │
└────────────┬────────────────────┘
             │
             │ git push
             ↓
    ┌────────────────────┐
    │   GitHub Repo      │
    │  (source code)     │
    └────────┬───────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────────┐  ┌──────────────┐
│  Backend    │  │   Frontend   │
│  Service    │  │   Service    │
│ (Render)    │  │  (Render)    │
│             │  │              │
│ Docker      │  │ Docker       │
│ Node.js     │  │ Nginx        │
│ Express     │  │ React SPA    │
│ SQLite      │  │              │
│ (in memory) │  │ Proxies      │
│             │  │ /api/* →     │
│             │◄─┤ backend:5000 │
│             │  │              │
└─────────────┘  └──────────────┘
     ↑                   ↑
   https://           https://
   projectstracker-  projectstracker-
   api.onrender.com   frontend.onrender.com
```

### Key Points
- **Backend**: Runs Express API on port 5000
- **Frontend**: Runs Nginx (serves React + proxies /api)
- **Database**: SQLite in memory (resets on restart)
- **Communication**: Frontend proxies to backend via `BACKEND_URL` env var

---

## ⚠️ Free Tier Limitations

| Feature | Free Tier | Starter Tier |
|---------|-----------|--------------|
| **Cost** | $0 | $7/service/month |
| **Data Persistence** | ❌ No disk | ✅ 1GB disk |
| **Sleep on Inactivity** | 15 min | ✅ Always on |
| **Database** | ❌ None | ✅ Available |
| **Max Services** | 5 | Unlimited |

**For this project on Free Tier:**
- ✅ Can deploy backend + frontend (2 services)
- ✅ Can test features, login, create projects
- ❌ **Data is lost on service restart** (no persistent disk)
- ❌ Service sleeps after 15 min idle (slow first request)

**When to upgrade to Starter:**
- Want to keep data long-term
- Want always-on service (no sleep)
- Ready for production use

See **UPGRADE_TO_STARTER.md** for easy upgrade path.

---

## 🔄 How It Works

### Deployment Flow

```
1. You create service in Render UI
2. Point to GitHub repo (via git URL)
3. Specify Dockerfile path (e.g., ./backend/Dockerfile)
4. Set environment variables (NODE_ENV, JWT_SECRET, etc.)
5. Render clones repo, builds Docker image
6. Container starts, runs `npm start`
7. Service gets public HTTPS URL
8. ✅ Live at xxx.onrender.com
```

### Service Communication

```
Browser Request:
  GET https://projectstracker-frontend.onrender.com/api/projects

Nginx on Frontend:
  Sees /api request
  Routes to: BACKEND_URL env var
  (https://projectstracker-api.onrender.com)

Backend:
  Processes request
  Returns data

Nginx:
  Sends response back to browser
```

---

## 📋 Services to Create

You'll create 2 services on Render:

### Service 1: Backend (projectstracker-api)
- **Dockerfile**: `./backend/Dockerfile`
- **Environment**:
  - `NODE_ENV=production`
  - `PORT=5000`
  - `JWT_SECRET` (auto-generated)
  - `CORS_ORIGIN=https://projectstracker-frontend.onrender.com`
  - `JWT_EXPIRES_IN=2h`
  - `DB_PATH=/tmp/database.sqlite` (in-memory, resets on restart)

### Service 2: Frontend (projectstracker-frontend)
- **Dockerfile**: `./frontend/Dockerfile`
- **Environment**:
  - `BACKEND_URL=https://projectstracker-api.onrender.com` (from backend service)

---

## 🎯 Next Steps

1. **Make sure code is pushed to GitHub**
   ```bash
   git push origin main
   ```

2. **Read**: FREE_TIER_OVERVIEW.md (understand limitations)

3. **Read**: MANUAL_DOCKER_SETUP.md (understand process)

4. **Follow**: DOCKER_SERVICE_SETUP_BACKEND.md (create backend)

5. **Follow**: DOCKER_SERVICE_SETUP_FRONTEND.md (create frontend)

6. **Test**: Login and create a project

7. **Troubleshoot** (if needed): TROUBLESHOOTING.md

---

## 💡 Important Notes

### About Free Tier Limitations

**Data Loss on Restart:**
- Free tier has no persistent disk
- SQLite database is in `/tmp` (temporary)
- When service restarts (redeploy, crash, 24-hour cycle), data is lost
- ✅ Fine for testing/development
- ❌ Not suitable for production

**Service Sleep:**
- Services sleep after 15 minutes of no requests
- First request after sleep takes ~30 seconds
- ✅ Fine for development
- ❌ Not suitable for production

**When to Upgrade:**
- See **UPGRADE_TO_STARTER.md**
- Just takes 5 minutes
- Adds persistent disk ($7/service/month)
- No code changes needed

### Why Manual Setup Instead of Blueprints?

Blueprints is a paid feature on Render. We're using the free tier, so we create services manually via the UI. Don't worry—it's just a few extra clicks, and the documentation makes it easy!

---

## 🆘 Need Help?

| Issue | Solution |
|-------|----------|
| "How do I create the backend service?" | Read DOCKER_SERVICE_SETUP_BACKEND.md |
| "Frontend can't reach backend" | Read TROUBLESHOOTING.md → "Connection Issues" |
| "Data disappears after restart" | Expected on free tier. See UPGRADE_TO_STARTER.md |
| "Service is slow after idle" | Expected on free tier. See UPGRADE_TO_STARTER.md for always-on |
| "Login doesn't work" | Read TROUBLESHOOTING.md → "Authentication Issues" |

---

## ✅ Success Checklist

After deployment:

- [ ] Backend service shows "Live" in Render Dashboard
- [ ] Frontend service shows "Live" in Render Dashboard
- [ ] Frontend URL loads in browser (shows login page)
- [ ] Can login with default credentials
- [ ] Can create a project
- [ ] API calls succeed (check Network tab in DevTools)
- [ ] Logout and login again (session management works)

---

## 📞 Support Resources

- **Render Docs**: https://docs.render.com
- **Docker Docs**: https://docs.docker.com
- **Project Docs**: See parent directory (DOCKER.md, DEPLOYMENT.md)
- **This Guide**: All files in this `render_com/` folder

---

## 🚀 Ready to Deploy?

Start with **DOCKER_SERVICE_SETUP_BACKEND.md** and follow the steps!

Good luck! You've got this! 💪
