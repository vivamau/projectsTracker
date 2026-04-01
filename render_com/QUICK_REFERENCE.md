# Render.com Free Tier - Quick Reference

## One-Page Deployment Guide

### Prerequisites
- Render.com free account
- GitHub with ProjectsTracker code pushed
- Files ready: `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/docker-entrypoint.sh`

---

## Deploy Backend (5 minutes)

```
1. Render Dashboard → [+ New] → Web Service
2. Connect: vivamau/projectsTracker (GitHub)
3. Name: projectstracker-api
4. Runtime: Docker
5. Dockerfile Path: ./backend/Dockerfile

Environment Variables:
  NODE_ENV          = production
  PORT              = 5000
  DB_PATH           = /tmp/database.sqlite
  JWT_SECRET        = (auto-generate or random string)
  JWT_EXPIRES_IN    = 2h
  CORS_ORIGIN       = https://projectstracker-frontend.onrender.com

6. Health Check Path: /health
7. [Create Web Service]
8. Wait 2-3 min for "Live" status
9. Copy backend URL from Dashboard
```

---

## Deploy Frontend (5 minutes)

```
1. Render Dashboard → [+ New] → Web Service
2. Connect: vivamau/projectsTracker (GitHub)
3. Name: projectstracker-frontend
4. Runtime: Docker
5. Dockerfile Path: ./frontend/Dockerfile

Environment Variables:
  BACKEND_URL = https://projectstracker-api.onrender.com
                (or your actual backend service URL)

6. [Create Web Service]
7. Wait 2-3 min for "Live" status
8. Open frontend URL in browser
9. Test login: admin@projecttracker.it / adminpassword
```

---

## Verify Deployment

```bash
# Backend health check
curl https://projectstracker-api.onrender.com/health
# Should return: {"status":"ok",...}

# Frontend
Open: https://projectstracker-frontend.onrender.com
See: Login page
```

---

## Environment Variables Summary

### Backend
| Key | Value |
|-----|-------|
| NODE_ENV | production |
| PORT | 5000 |
| DB_PATH | /tmp/database.sqlite |
| JWT_SECRET | (random string) |
| JWT_EXPIRES_IN | 2h |
| CORS_ORIGIN | https://projectstracker-frontend.onrender.com |

### Frontend
| Key | Value |
|-----|-------|
| BACKEND_URL | https://projectstracker-api.onrender.com |

---

## Free Tier Limitations

❌ **Data Loss**: SQLite in /tmp resets on restart  
❌ **Service Sleep**: Services sleep after 15 min idle  
❌ **No Disk**: No persistent storage  
✅ **HTTPS**: Free SSL certificates  
✅ **Auto-Deploy**: Push to GitHub → auto-redeploy  

---

## Update Code

```bash
# Make changes locally
git add .
git commit -m "your message"
git push origin main

# Render auto-redeploys (2-3 min)
```

---

## Monitor Services

```
Render Dashboard:
  → projectstracker-api
    → Logs (see startup/errors)
    → Settings (change env vars)
    → Manual Deploy (restart)

  → projectstracker-frontend
    → Logs (see Nginx startup)
    → Settings (change env vars)
    → Manual Deploy (restart)
```

---

## Get Service URLs

```
Render Dashboard → Service name → Copy URL from top

Backend:  https://projectstracker-api.onrender.com
Frontend: https://projectstracker-frontend.onrender.com
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Check logs, fix code, git push |
| Can't login | Check BACKEND_URL in frontend env vars |
| API calls fail | Verify backend service is "Live" |
| Slow startup | Free tier service wake-up (normal) |
| Data disappeared | Free tier limitation (no disk) |

---

## Upgrade to Starter (Later)

```
Render Dashboard:
  → Service → Settings → Plan
  → Change from "Free" to "Starter"
  → Add persistent disk (1GB)
  → Cost: $7/service/month
  → Data survives restarts ✅
```

See: UPGRADE_TO_STARTER.md

---

## Architecture

```
Browser
  ↓
Nginx Frontend (on Render)
  ├─ Serves React SPA
  └─ Proxies /api/* → Backend
       ↓
Express Backend (on Render)
  ├─ API endpoints
  └─ SQLite (/tmp - temporary)
```

---

## Success Indicators

✅ Both services show "Live"  
✅ Frontend URL loads login page  
✅ Can login with admin credentials  
✅ Can create projects  
✅ API calls succeed (check Network tab)  

---

## Full Documentation

- **README.md** - Overview
- **FREE_TIER_OVERVIEW.md** - Limitations & architecture
- **DOCKER_SERVICE_SETUP_BACKEND.md** - Backend setup details
- **DOCKER_SERVICE_SETUP_FRONTEND.md** - Frontend setup details
- **TROUBLESHOOTING.md** - Common issues
- **UPGRADE_TO_STARTER.md** - Add persistent storage

---

## Timeline

**Day 1**: Deploy to free tier (10 min)  
**Days 2-7**: Test features, gather feedback  
**Week 2**: Decide if you need persistence  
**Later**: Upgrade to Starter tier if needed ($7/month)  

---

Good luck! 🚀

Need help? See the detailed guides in this folder!
