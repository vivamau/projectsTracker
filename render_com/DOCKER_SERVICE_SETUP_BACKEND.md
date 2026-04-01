# Render.com: Create Backend Service (Docker)

This guide walks you through creating the backend API service on Render.com using Docker.

## Prerequisites

✅ Render.com free account  
✅ GitHub account with ProjectsTracker pushed  
✅ Backend code at: `projectsTracker/backend/`  

---

## Step-by-Step: Create Backend Service

### Step 1: Go to Render Dashboard

1. Open [render.com](https://render.com)
2. Login to your account
3. You'll see the Dashboard

### Step 2: Click "New" Button

Look for the **+ New** button in the top-left corner

```
┌────────────────────────────┐
│ RENDER DASHBOARD           │
├────────────────────────────┤
│ [+ New]  [Blueprints]      │  ← Click [+ New]
│                            │
│ Services                   │
│ (empty)                    │
└────────────────────────────┘
```

### Step 3: Select "Web Service"

A dropdown menu appears:

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

You'll see:

```
┌───────────────────────────────────┐
│ Create Web Service                │
├───────────────────────────────────┤
│ Connect a repository              │
│                                   │
│ Source: [GitHub]  [GitLab]        │
│                                   │
│ Repositories:                     │
│ ☐ vivamau/projectsTracker        │  ← Select
│   (or search for your repo)       │
└───────────────────────────────────┘
```

1. Make sure **GitHub** is selected
2. Find your repo in the list: `vivamau/projectsTracker` (or your username/projectsTracker)
3. Click to select it

### Step 5: Configure Service Settings

After selecting the repo, you'll see configuration options:

```
┌───────────────────────────────────┐
│ Configure Web Service             │
├───────────────────────────────────┤
│ Name:  projectstracker-api        │  (preset, OK to keep)
│ Branch: main                       │  (preset, OK to keep)
│ Root Directory: (leave blank)      │  (preset, OK to keep)
│ Runtime: Docker                    │  ← MUST BE DOCKER
│ Build Command: (leave blank)       │  (Docker handles it)
│ Start Command: (leave blank)       │  (Dockerfile handles it)
│ Plan: Free                         │  (preset, OK to keep)
│                                   │
│ Environment:                       │  ← Set these ↓
└───────────────────────────────────┘
```

### Step 6: Set Dockerfile Path

Scroll down to find "Dockerfile path" or "Build settings":

```
Dockerfile Path: ./backend/Dockerfile     ← ENTER THIS
```

This tells Render where your Dockerfile is.

### Step 7: Set Environment Variables

Click the **Environment** section to expand it.

Add these variables one by one by clicking **+ Add Environment Variable**:

**Variable 1:**
```
Key:   NODE_ENV
Value: production
```

**Variable 2:**
```
Key:   PORT
Value: 5000
```

**Variable 3:**
```
Key:   DB_PATH
Value: /tmp/database.sqlite
```

(Note: `/tmp` is temporary storage. Data resets on restart. This is normal for free tier.)

**Variable 4:**
```
Key:   JWT_SECRET
Value: (leave this blank - Render will auto-generate)
```

OR if you want to set it yourself:
```
Key:   JWT_SECRET
Value: your-random-secret-string-min-32-chars
```

Generate one:
```bash
# Run in terminal to generate random secret
openssl rand -base64 32
```

**Variable 5:**
```
Key:   JWT_EXPIRES_IN
Value: 2h
```

**Variable 6:**
```
Key:   CORS_ORIGIN
Value: (leave blank for now, or enter manually after frontend is created)
```

Or hardcode if you know it:
```
Value: https://projectstracker-frontend.onrender.com
```

### Step 8: Set Health Check

Scroll down to **Advanced** or **Health Check** section:

```
Health Check Path: /health
```

This tells Render to check if the service is ready by calling `/health` endpoint.

### Step 9: Review and Deploy

Review all settings:

```
✓ Repository: vivamau/projectsTracker
✓ Branch: main
✓ Runtime: Docker
✓ Dockerfile Path: ./backend/Dockerfile
✓ Name: projectstracker-api
✓ Plan: Free
✓ Environment Variables: Set (6 variables)
✓ Health Check: /health
```

Click **Create Web Service** button (usually at the bottom)

### Step 10: Watch Deployment

You'll see a build log:

```
Building...
  → Cloning repository
  → Building Docker image from ./backend/Dockerfile
  → Installing dependencies (npm ci)
  → Starting container
  → Running migrations
  → Health check passing ✓

Status: Live ✅
```

This takes about 2-3 minutes.

---

## What Happens During Deployment

1. **Clone**: Render clones your GitHub repo
2. **Build**: Builds Docker image using `backend/Dockerfile`
3. **Install**: Runs `npm ci` (installs production deps)
4. **Create DB**: Initializes SQLite (empty on first run)
5. **Migrations**: Runs `run_migrations.js` (creates tables)
6. **Seeds**: Runs `seed_users.js` (creates default users)
7. **Start**: Runs `npm start` (starts Express server)
8. **Health Check**: Pings `/health` endpoint
9. **Live**: Service is ready! 🎉

---

## After Deployment: Verify Backend is Running

### Get the Backend URL

In Render Dashboard:
1. Click on **projectstracker-api** service
2. Look for the public URL (e.g., `https://projectstracker-api.onrender.com`)
3. Copy it

### Test the Health Endpoint

```bash
# In terminal, test the health endpoint
curl https://projectstracker-api.onrender.com/health

# Should return:
# {"status":"ok","timestamp":"2026-04-01T..."}
```

If you see this response, your backend is running! ✅

### Check the Logs

In Render Dashboard:
1. Click **projectstracker-api**
2. Click **Logs** tab
3. Scroll to see startup messages

Look for:
```
Database initialized
Running migrations
Migrations complete
Server running on port 5000
```

---

## Environment Variables Reference

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `production` | Tells app to run in production mode |
| `PORT` | `5000` | Port Express listens on (internal) |
| `DB_PATH` | `/tmp/database.sqlite` | SQLite database location (temp, resets on restart) |
| `JWT_SECRET` | Random string | Signing secret for JWT tokens (must be 32+ chars) |
| `JWT_EXPIRES_IN` | `2h` | How long login sessions last |
| `CORS_ORIGIN` | `https://projectstracker-frontend.onrender.com` | Frontend URL (allow requests from this origin) |

---

## Common Issues & Fixes

### Issue: "Build failed"

**Cause**: Docker image failed to build

**Fix**:
1. Check logs: Click **Logs** tab
2. Look for error message
3. Common causes:
   - Dockerfile syntax error
   - Missing file
   - npm module not found
4. Fix the issue in your code
5. Push to GitHub
6. Render auto-redeploys (or click **Manual Deploy**)

### Issue: "Health check failed"

**Cause**: Server didn't start properly

**Fix**:
1. Check logs for error messages
2. Look for port conflicts
3. Verify NODE_ENV is set to `production`
4. Check database initialization

### Issue: "Timeout waiting for container to start"

**Cause**: Server took too long to start

**Fix**:
1. Check database migrations in logs
2. On first deploy, migrations take time
3. Wait longer before checking (up to 2 min)

---

## Next Steps

1. ✅ Backend service is running
2. **Copy the backend URL** (e.g., `https://projectstracker-api.onrender.com`)
3. **Create Frontend Service** - See DOCKER_SERVICE_SETUP_FRONTEND.md
4. **In Frontend setup**, use this backend URL for `BACKEND_URL` env var

---

## Success Indicators

✅ Service shows "Live" in Render Dashboard  
✅ `/health` endpoint returns `{"status":"ok",...}`  
✅ Logs show "Server running on port 5000"  
✅ No error messages in logs  

If all checked: Your backend is ready! 🎉

---

## Monitoring & Debugging

### View Logs

```
Render Dashboard:
  → projectstracker-api
    → Logs tab
    → Newest messages at bottom
    → Scroll up for historical logs
```

### Restart Service

If service is stuck:
```
Render Dashboard:
  → projectstracker-api
    → Settings
    → Manual Deploy
    → (service restarts)
```

### Change Environment Variables

After initial creation:
```
Render Dashboard:
  → projectstracker-api
    → Environment
    → Click variable to edit
    → Change value
    → Service redeploys automatically
```

---

## Ready for Frontend?

Once your backend is deployed and showing "Live":

✅ **Copy the backend URL** from Render Dashboard  
✅ **Proceed to**: DOCKER_SERVICE_SETUP_FRONTEND.md  
✅ **Use the backend URL** for the `BACKEND_URL` environment variable in frontend  

Good luck! 🚀
