# Render.com: Create Frontend Service (Docker)

This guide walks you through creating the frontend service on Render.com using Docker.

**Prerequisites**: You already created the backend service and have its URL.

---

## Before You Start

### Get Backend URL from Render

1. Go to Render Dashboard
2. Click **projectstracker-api** service
3. Copy the public URL (e.g., `https://projectstracker-api.onrender.com`)
4. **Save this somewhere** - you'll need it in a moment

---

## Step-by-Step: Create Frontend Service

### Step 1: Go to Render Dashboard

1. Make sure you're logged into [render.com](https://render.com)
2. You're on the Dashboard

### Step 2: Click "+ New" Button

Same as backend:

```
[+ New]  [Blueprints]
```

Click **+ New**

### Step 3: Select "Web Service"

```
+ New
├─ Web Service       ← CLICK THIS
├─ Static Site
├─ Background Worker
├─ Cron Job
└─ PostgreSQL
```

Click **Web Service**

### Step 4: Connect Your GitHub Repository

```
┌───────────────────────────────────┐
│ Create Web Service                │
├───────────────────────────────────┤
│ Source: [GitHub]  [GitLab]        │
│                                   │
│ Repositories:                     │
│ ☐ vivamau/projectsTracker        │  ← Select
└───────────────────────────────────┘
```

Select: `vivamau/projectsTracker` (same repo as backend)

### Step 5: Configure Service Settings

After selecting, you'll see:

```
┌───────────────────────────────────┐
│ Configure Web Service             │
├───────────────────────────────────┤
│ Name: projectstracker-frontend    │  (preset, OK)
│ Branch: main                       │  (preset, OK)
│ Root Directory: (blank)            │  (preset, OK)
│ Runtime: Docker                    │  ← MUST BE DOCKER
│ Build Command: (blank)             │  (Dockerfile handles it)
│ Start Command: (blank)             │  (Dockerfile handles it)
│ Plan: Free                         │  (preset, OK)
└───────────────────────────────────┘
```

### Step 6: Set Dockerfile Path

Find the "Dockerfile path" field:

```
Dockerfile Path: ./frontend/Dockerfile     ← ENTER THIS
```

### Step 7: Set Environment Variables

Click **Environment** to expand it.

Add these variables:

**Variable 1:**
```
Key:   BACKEND_URL
Value: https://projectstracker-api.onrender.com
```

**Use the backend URL you copied earlier!** This is critical for frontend to communicate with backend.

Example (replace with your actual backend URL):
```
Key:   BACKEND_URL
Value: https://projectstracker-api.onrender.com
                                    ^
                                    If your backend service has a different name,
                                    the URL will be different!
```

### Step 8: Review Settings

Check:

```
✓ Repository: vivamau/projectsTracker
✓ Branch: main
✓ Runtime: Docker
✓ Dockerfile Path: ./frontend/Dockerfile
✓ Name: projectstracker-frontend
✓ Plan: Free
✓ Environment Variables:
  - BACKEND_URL: https://projectstracker-api.onrender.com
✓ No Health Check needed (Nginx starts immediately)
```

### Step 9: Create Service

Click **Create Web Service** button

### Step 10: Watch Deployment

Build log appears:

```
Building...
  → Cloning repository
  → Building Docker image from ./frontend/Dockerfile
  → Stage 1: npm install (Vite build)
  → npm run build (creates dist/ folder)
  → Stage 2: Running entrypoint script
  → docker-entrypoint.sh substituting ${BACKEND_URL}
  → Starting Nginx
  → Nginx listening on port 80

Status: Live ✅
```

Takes about 2-3 minutes.

---

## What Happens During Deployment

1. **Clone**: Render clones your GitHub repo
2. **Stage 1 (Builder)**:
   - Runs `npm install` in frontend/
   - Runs `npm run build` to create dist/
   - Creates optimized React bundle
3. **Stage 2 (Nginx)**:
   - Copies dist/ to Nginx html directory
   - Installs `gettext` (for envsubst)
   - Copies docker-entrypoint.sh
4. **Startup**:
   - docker-entrypoint.sh runs
   - Substitutes `${BACKEND_URL}` in nginx config
   - Starts Nginx
5. **Live**: Service is ready! 🎉

---

## After Deployment: Get Frontend URL

### Find the Frontend URL

In Render Dashboard:
1. Click on **projectstracker-frontend** service
2. Look for the public URL (e.g., `https://projectstracker-frontend.onrender.com`)
3. Copy it

### Test the Frontend

1. Open the URL in your browser
2. You should see the login page ✅

If you see login page: It works!

### Test Login

```
Email:    admin@projecttracker.it
Password: adminpassword

Click [Login]
```

You should be logged in! 🎉

---

## Test Frontend-Backend Communication

After logging in:

1. Click **Projects** (or similar feature that makes API calls)
2. Open DevTools (F12 or Cmd+Option+I)
3. Click **Network** tab
4. Try to create a project
5. Look for API calls:
   - Should see `/api/projects` call
   - Should return 200 or 201 status ✅
   - URL should be something like: `https://projectstracker-frontend.onrender.com/api/projects`

**Why this URL?** Nginx on frontend proxies `/api/*` calls to the backend via the `BACKEND_URL` env var.

---

## How Frontend-Backend Connection Works

### The Flow

```
Browser:
  GET https://projectstracker-frontend.onrender.com/api/projects

Nginx (on Frontend):
  Sees /api path
  Reads BACKEND_URL env var
  (which is: https://projectstracker-api.onrender.com)
  
  proxy_pass https://projectstracker-api.onrender.com
  
Backend:
  Processes request
  Returns data
  
Nginx:
  Sends response back to browser
```

### Why This Architecture?

- **Cookies work**: Frontend and backend appear on same domain to browser
- **No CORS needed**: Proxy handles it
- **Single entry point**: All traffic through frontend URL

---

## Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `BACKEND_URL` | `https://projectstracker-api.onrender.com` | **CRITICAL**: Where Nginx proxy sends API calls |

That's it! Just one variable for frontend.

---

## Dockerfile Details (What Happened)

The `frontend/Dockerfile` did several things:

```dockerfile
# Stage 1: Build React app
FROM node:20-alpine
  → npm ci (install deps)
  → npm run build (creates dist/)

# Stage 2: Run with Nginx
FROM nginx:alpine
  → apk add gettext (for envsubst)
  → Copy nginx config as template
  → Copy entrypoint script
  → docker-entrypoint.sh substitutes ${BACKEND_URL}
  → Start Nginx
```

The **entrypoint script** is the key:

```bash
#!/bin/sh
# Substitute BACKEND_URL in nginx config
envsubst '${BACKEND_URL}' < template > config

# Start Nginx
nginx -g 'daemon off;'
```

This allows Nginx config to use the `BACKEND_URL` env var at runtime.

---

## Common Issues & Fixes

### Issue: Frontend loads but login fails

**Cause**: Frontend can't reach backend

**Fix**:
1. Check `BACKEND_URL` env var in Render:
   - Dashboard → projectstracker-frontend → Environment
   - Verify value matches your backend service URL
2. If wrong, edit the value and redeploy
3. Render auto-redeploys on env var change

### Issue: Page loads but all features are broken

**Cause**: Backend URL is wrong

**Fix**:
1. Open browser DevTools (F12)
2. Network tab → Try to use a feature
3. Look at API call URL - should be something like:
   ```
   https://projectstracker-frontend.onrender.com/api/projects
   ```
4. If you see a different domain (like direct to backend), then `BACKEND_URL` is wrong

### Issue: "Cannot GET /" on frontend URL

**Cause**: Nginx not starting correctly

**Fix**:
1. Check logs: Dashboard → projectstracker-frontend → Logs
2. Look for error messages
3. Check if entrypoint script ran (look for "substituting" message)

### Issue: Frontend service stuck "Building"

**Cause**: Docker image build taking too long (or failed)

**Fix**:
1. Wait 5 more minutes (builds can be slow)
2. If still building after 10 min, check logs
3. Click **Settings** → **Manual Deploy** to restart

---

## How to Update Frontend

If you make changes to frontend code:

```bash
# 1. Make your changes locally
# 2. Commit and push
git add .
git commit -m "Frontend updates"
git push origin main

# 3. Render auto-redeploys (watch Dashboard)
# 4. Service rebuilds and restarts
# 5. Changes live in 2-3 minutes
```

Render watches your GitHub repo and auto-deploys on push!

---

## Success Indicators

✅ Service shows "Live" in Render Dashboard  
✅ Frontend URL loads in browser  
✅ Login page appears  
✅ Can login with admin credentials  
✅ Can create a project  
✅ Network tab shows API calls to `/api/*`  
✅ API calls return 200 status  

If all checked: Frontend is working! 🎉

---

## Next Steps

1. ✅ Frontend is live
2. **Test the app**:
   - Create projects
   - Test all features
   - Try logout/login
3. **Share the URL** with your team
4. **If ready for production**: See UPGRADE_TO_STARTER.md (adds persistent disk)

---

## Quick Troubleshooting

| Symptom | Check |
|---------|-------|
| Page won't load | Dashboard → Logs (frontend service) |
| Login fails | `BACKEND_URL` env var (frontend service) |
| API calls fail | Check backend service is "Live" |
| Slow after idle | Expected on free tier (service wakes up) |
| Data disappeared | Expected on free tier (no persistent disk) |

---

## Production Notes

This free tier setup is great for:
- ✅ Development
- ✅ Testing
- ✅ Demos
- ✅ Learning

Not suitable for:
- ❌ Production apps
- ❌ Long-term data
- ❌ Real users

To go production: See UPGRADE_TO_STARTER.md

---

## Congratulations! 🎉

Your ProjectsTracker is now deployed to Render.com on the free tier!

- Backend: https://projectstracker-api.onrender.com
- Frontend: https://projectstracker-frontend.onrender.com

Share the frontend URL with your team!

Good luck! 🚀
