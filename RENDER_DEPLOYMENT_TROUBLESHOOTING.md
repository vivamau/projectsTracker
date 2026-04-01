# Render Deployment - Complete Troubleshooting & Reference

## You Hit This Error

```
Error: failed to solve: dockerfile parse error on line 1: unknown instruction: services:
You're pointing to render.yaml as your Dockerfile Path.
```

---

## Why This Happened

You followed a common pattern of going to Render and clicking:
```
New → Service → Set Dockerfile Path: render.yaml
```

But `render.yaml` is **NOT a Dockerfile**—it's a **Blueprint configuration file**.

Render tried to parse it as a Dockerfile:
```
Line 1: services:    ← Not a valid Docker instruction!
        ↑ ERROR: Docker doesn't know what "services" means
```

---

## The Fix (One Command + 6 Clicks)

### Step 0: Commit render.yaml to Git

```bash
git add render.yaml
git commit -m "Add Render Blueprint"
git push origin main
```

### Step 1-6: Use Blueprints (Not "New Service")

1. Go to Render → **Blueprints** (left sidebar)
2. Click **New Blueprint**
3. Click **Connect Repository**
4. Select your GitHub repo (projectsTracker)
5. Select branch (main/master)
6. **Render auto-detects render.yaml and shows both services**
7. Click **Create New Group**

**That's it!** Both services deploy automatically.

---

## Understanding the Difference

### What You Did (Wrong)

```
Manual Service Creation:
  1. New → Service (single service)
  2. Name: projectstracker-api
  3. Dockerfile Path: render.yaml  ← ERROR!
  
Render said: "This file contains 'services:' not Docker instructions"
```

### What You Should Do (Right)

```
Blueprint Creation:
  1. Blueprints → New Blueprint (multi-service)
  2. Connect repo
  3. Render reads render.yaml automatically
  4. Render creates TWO services based on config:
     - projectstracker-api (using ./backend/Dockerfile)
     - projectstracker-frontend (using ./frontend/Dockerfile)
```

---

## render.yaml vs Dockerfile vs docker-compose.yml

| File | Purpose | Format | Where to Use |
|------|---------|--------|------------|
| **Dockerfile** | Instructions to build a Docker image | Docker syntax (FROM, RUN, etc.) | Inside containers, or as "Dockerfile Path" in service config |
| **docker-compose.yml** | Local multi-container orchestration | YAML syntax | Local machine, with `docker compose` command |
| **render.yaml** | Render.com Blueprint for multi-service deployment | YAML syntax | Git repo root, Render auto-detects it |

**Key point:** Never use YAML files as "Dockerfile Path"—only actual Dockerfiles!

---

## Documentation Files to Read

In order of importance:

1. **RENDER_QUICK_FIX.md** ← Start here! (This explains your error)
2. **RENDER_CLICK_BY_CLICK.md** ← Step-by-step UI instructions
3. **RENDER_BLUEPRINT_VS_MANUAL.md** ← Understand the difference
4. **RENDER_SETUP_SUMMARY.md** ← Architecture overview
5. **RENDER_DEPLOYMENT.md** ← Full production guide

---

## Verify Files Are Ready

Before deploying, check:

```bash
# 1. render.yaml exists at root
ls render.yaml

# 2. Both Dockerfiles exist
ls backend/Dockerfile
ls frontend/Dockerfile

# 3. Entrypoint script exists
ls frontend/docker-entrypoint.sh

# 4. All committed to git
git log render.yaml  # Should show recent commit
git status           # Should be clean

# 5. Pushed to GitHub
git push origin main
```

---

## The Correct Deployment Flow

```
Step 1: Files in Git
   ├─ render.yaml (root) ✅
   ├─ backend/Dockerfile ✅
   ├─ frontend/Dockerfile ✅
   ├─ frontend/docker-entrypoint.sh ✅
   └─ frontend/nginx.conf ✅

Step 2: Go to Render
   └─ Dashboard → Blueprints → New Blueprint

Step 3: Connect Repo
   └─ Render scans root for render.yaml ✅

Step 4: Auto-Detect Services
   ├─ projectstracker-api (uses ./backend/Dockerfile)
   └─ projectstracker-frontend (uses ./frontend/Dockerfile)

Step 5: Deploy
   └─ Click "Create New Group"

Step 6: Both Services Live
   ├─ projectstracker-api.onrender.com
   └─ projectstracker-frontend.onrender.com
```

---

## Common Issues & Fixes

### Issue 1: "Blueprint not detected"

**Cause:** render.yaml not in root or not pushed to GitHub

**Fix:**
```bash
# Verify file is at root
ls -la render.yaml

# Verify it's in git
git log render.yaml

# Push to GitHub
git push origin main

# Try again
# Blueprints → New Blueprint
```

### Issue 2: "unknown instruction: services:" (Your Error)

**Cause:** Using "New Service" instead of "New Blueprint"

**Fix:**
1. Go to Dashboard
2. Delete the broken service
3. Click Blueprints → New Blueprint (NOT "New Service")
4. Let Render auto-detect render.yaml

### Issue 3: "Dockerfile not found"

**Cause:** Path in render.yaml doesn't match file

**Fix:**
```bash
# Verify paths in render.yaml
grep dockerfilePath render.yaml
# Should show: ./backend/Dockerfile and ./frontend/Dockerfile

# Verify files exist at those paths
ls backend/Dockerfile
ls frontend/Dockerfile
```

### Issue 4: Services deploy but can't login

**Cause:** Frontend can't reach backend or CORS issue

**Fix:**
- Check backend logs (Render Dashboard → projectstracker-api → Logs)
- Look for error starting migrations (wait 40+ seconds on first deploy)
- Check frontend logs for proxy errors

### Issue 5: "Port already in use"

**Cause:** Service trying to use port that's taken

**Fix:**
- Check Render service logs for port errors
- Verify PORT env var is set to 5000 (backend)
- Render handles ports internally, shouldn't happen

---

## Success Indicators

### ✅ Deployment Successful

```
Both services show "Live" in Render Dashboard:
  projectstracker-api    ✅ Live
  projectstracker-frontend ✅ Live
```

### ✅ App is Working

```
1. Open projectstracker-frontend.onrender.com
2. See login page
3. Login: admin@projecttracker.it / adminpassword
4. Create a project
5. Check Network tab (APIs should show 200 status)
6. See data persists across page refreshes
```

### ✅ Auth is Working

```
1. Login successful (cookie stored)
2. Navigate around app (API calls work)
3. Logout (session cleared)
4. Login again (new session created)
```

---

## Advanced Troubleshooting

### Check Backend Logs

```
Render Dashboard:
  → projectstracker-api
    → Logs tab
    → Look for errors or "Running migrations..."
```

### Check Frontend Logs

```
Render Dashboard:
  → projectstracker-frontend
    → Logs tab
    → Look for "docker-entrypoint.sh running"
    → Should show nginx starting
```

### Verify Service URLs

```
Render Dashboard:
  → projectstracker-api
    → Copy full URL (e.g., https://projectstracker-api.onrender.com)
    → Open in browser
    → Should see {"status": "ok"} from /health endpoint
```

### Test API Directly

```bash
# From your terminal (or browser)
curl https://projectstracker-api.onrender.com/health
# Should return: {"status":"ok","timestamp":"2026-04-01T..."}

curl https://projectstracker-frontend.onrender.com
# Should return: HTML of React app
```

---

## If Deployment Still Fails

1. **Delete everything** (both services)
2. **Read RENDER_QUICK_FIX.md** carefully
3. **Read RENDER_CLICK_BY_CLICK.md** and follow exact steps
4. **Verify** each prerequisite:
   - [ ] render.yaml at project root
   - [ ] render.yaml committed to git
   - [ ] render.yaml pushed to GitHub
   - [ ] Both Dockerfiles exist
   - [ ] Used "Blueprints" menu (NOT "New Service")
5. **Try again** with fresh deployment

---

## Key Takeaway

```
render.yaml is NOT a Dockerfile.
It's a configuration file that tells Render how to build MULTIPLE services.

To deploy:
  Dashboard → Blueprints → New Blueprint
  (NOT: Dashboard → New Service)

Render will automatically:
  1. Read render.yaml from your repo
  2. Create projectstracker-api service
  3. Create projectstracker-frontend service
  4. Set environment variables automatically
  5. Deploy both services

You just click "Create New Group" and wait!
```

---

## Support Resources

- **Render Docs**: https://docs.render.com/deploy-blueprints
- **Project Docs**: See RENDER_QUICK_FIX.md, RENDER_CLICK_BY_CLICK.md
- **Docker Docs**: https://docs.docker.com

---

## Quick Checklist: Ready to Deploy?

- [ ] All files committed to git (`git status` shows clean)
- [ ] render.yaml in git root
- [ ] Both Dockerfiles exist
- [ ] docker-entrypoint.sh exists
- [ ] nginx.conf has `${BACKEND_URL}` variable
- [ ] Pushed to GitHub (`git push origin main`)
- [ ] Will use Blueprints (NOT "New Service")
- [ ] Ready to click "Create New Group"

**If all checked: You're ready! 🚀**

---

Good luck! You've got this! 💪
