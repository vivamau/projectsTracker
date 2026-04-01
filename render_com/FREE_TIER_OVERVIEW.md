# Render.com Free Tier Overview

## What You're Getting

Render.com **Free Tier** includes:

✅ **Unlimited Services** (up to 5 running at once)  
✅ **Docker Deployment** (build from Dockerfile)  
✅ **Public HTTPS URLs** (free SSL certificates)  
✅ **Auto-Deploy from GitHub** (push code → auto-redeploy)  
✅ **GitHub Integration** (webhook triggers)  
✅ **Email Notifications** (deployment alerts)  

## What You're NOT Getting (Free Tier Limitations)

❌ **Persistent Storage** - No disk, data lost on restart  
❌ **Always-On** - Services sleep after 15 min inactivity  
❌ **Databases** - PostgreSQL, MySQL are paid only  
❌ **Custom Domains** - Free subdomains only (xxx.onrender.com)  
❌ **Advanced Monitoring** - Basic logs only  
❌ **Priority Support** - Community support only  

---

## For This Project: ProjectsTracker

### What Works Fine

✅ **Deploy Backend** - Express API in Docker  
✅ **Deploy Frontend** - React SPA in Nginx Docker  
✅ **Test Features** - Create projects, manage budgets  
✅ **Test Authentication** - Login/logout works  
✅ **Test API** - Frontend ↔ Backend communication  
✅ **Share with Team** - Public URL (https://xxx.onrender.com)  

### What Doesn't Work Long-Term

❌ **Data Persistence** - SQLite resets on service restart  
❌ **Production Use** - Service sleeps after 15 min  
❌ **24/7 Uptime** - Services cycle/restart periodically  

---

## Free vs Starter Tier (Side-by-Side)

| Feature | Free | Starter |
|---------|------|---------|
| **Cost** | $0 | $7/service/month |
| **Services** | Up to 5 | Unlimited |
| **Sleep After Inactivity** | 15 min | Never |
| **Persistent Disk** | ❌ None | ✅ 1GB per service |
| **Data Persistence** | ❌ Resets on restart | ✅ Survives restarts |
| **First Request After Sleep** | ~30s | Instant |
| **CPU/Memory** | Shared | Dedicated |
| **GitHub Auto-Deploy** | ✅ Yes | ✅ Yes |
| **HTTPS/SSL** | ✅ Free | ✅ Free |

---

## Data Persistence Problem (Free Tier)

### What Happens

```
Free Tier Timeline:

1. Deploy: Service starts, SQLite at /tmp/database.sqlite
2. Create project: Data saved to SQLite
3. 20 min later: No requests → Service sleeps
4. Request comes in: Service wakes up, but /tmp is cleared
5. Previous data: GONE ❌

OR:

1. Render maintenance: Service restarts
2. Service comes back: /tmp is empty
3. All previous data: GONE ❌
```

### Why It Happens

- Free tier doesn't support persistent disks
- `/tmp` directories are temporary storage (cleared on restart)
- No way to keep data long-term without paid disk

---

## Service Sleep Problem (Free Tier)

### What Happens

```
Timeline:

1. Deploy: Service is running and responding quickly
2. 15 min of no requests: Service goes to sleep
3. User visits app: Request wakes up service
4. Wait 20-30 seconds: Service initializes
5. Page loads: Now responsive again
```

### Why It Happens

- Free tier has limited resources
- Render sleeps unused services to save costs
- First request after sleep is slow

---

## When to Use Free Tier

✅ **Good for:**
- Development & testing
- Learning Render.com
- Demos for team/stakeholders
- Short-term projects
- Portfolio projects (with disclaimer about data)

❌ **Not suitable for:**
- Production apps
- Apps needing 24/7 uptime
- Apps with persistent data
- Apps with critical business logic

---

## When to Upgrade to Starter

Consider upgrading when:
- ✅ You want to keep data long-term
- ✅ You want always-on service (no sleep)
- ✅ You're ready for production
- ✅ You have real users depending on it

**Cost**: $7/service/month  
**Benefit**: Persistent disk + always-on  
**Easy upgrade**: No code changes needed (see UPGRADE_TO_STARTER.md)

---

## Architecture on Free Tier

```
┌─────────────────────────────────┐
│   GitHub Repository             │
│   (ProjectsTracker code)        │
└────────────────┬────────────────┘
                 │
                 │ git push
                 ↓
        ┌────────────────────┐
        │   Render.com       │
        │   (Free Tier)      │
        └────────┬───────────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
    ┌─────────┐     ┌──────────┐
    │ Backend │     │ Frontend │
    │ Service │     │ Service  │
    │         │     │          │
    │ Docker  │     │ Docker   │
    │ Node.js │     │ Nginx    │
    │ SQLite  │     │ React    │
    │ /tmp/   │     │ Proxies  │
    │ (temp)  │     │ /api/*   │
    │         │     │          │
    └────┬────┘     └────┬─────┘
         │               │
         │ Sleeps after  │ Sleeps after
         │ 15 min idle   │ 15 min idle
         │               │
         │ Data lost on  │
         │ restart       │
         └───────┬───────┘
                 │
        Free Tier Limitations
```

---

## Typical Free Tier Usage

### Week 1: Development
- Deploy backend → test endpoints
- Deploy frontend → test UI
- Create sample projects → verify flow
- ✅ Everything works

### Week 2: Testing
- Team accesses shared URL
- Test features together
- Demo to stakeholders
- ✅ Good for feedback

### Week 3: Service Sleep
- If app unused for 24+ hours
- Services sleep to save resources
- First visit takes 30 seconds (slow)
- ⚠️ Not ideal for daily use

### Data Loss Event
- Eventually service restarts (maintenance, crash, etc.)
- All data in SQLite is lost
- ❌ Back to empty database

---

## Workarounds on Free Tier

### Option 1: Accept Data Loss
- Simplest approach
- Redeploy/restart = data resets
- Fine for testing/demos
- ✅ **We're doing this for now**

### Option 2: Backup Data
- Export projects before restart
- Re-import after restart
- Manual, but preserves some data
- Tedious long-term

### Option 3: Use External Database
- Connect to free PostgreSQL (if available)
- Data persists separately
- Requires code changes
- Complex setup

### Option 4: Upgrade to Starter Tier
- Add 1GB persistent disk
- Always-on service (no sleep)
- Data preserved long-term
- ✅ **Recommended for production**

---

## Monitoring & Alerts

### On Free Tier

✅ Can see:
- Service logs (last 100 lines)
- Deployment history
- Service status (Live/Sleeping/Failed)
- Environment variables (hidden except names)

❌ Can't see:
- Performance metrics
- CPU/Memory usage (realtime)
- Advanced analytics
- Custom alerts

### Checking Logs

```
Render Dashboard:
  → Service name
    → Logs tab
    → Scroll through output
    → Check for errors
```

---

## Expected Performance

### After Fresh Deploy
- Backend response: ~100-200ms
- Frontend page load: ~1-2s
- API calls: ~200-500ms

### After 15 Min Idle (Sleep)
- First request: ~20-30s (service waking up)
- Subsequent requests: ~100-200ms again

### Architecture Notes
- Both backend and frontend run on shared infrastructure
- Performance varies based on Render's load
- Free tier has lower priority than paid tiers

---

## Gradual Upgrade Path

Don't need to pay for everything at once:

```
Phase 1: Free Tier (Now)
  - Backend service ($0)
  - Frontend service ($0)
  - Test & validate
  - Cost: $0/month

Phase 2: Starter Backend (Later)
  - Upgrade backend to Starter ($7)
  - Add persistent disk for SQLite
  - Data survives restarts
  - Cost: $7/month

Phase 3: Starter Frontend (Later)
  - Upgrade frontend to Starter ($7)
  - Always-on (no sleep)
  - Better performance
  - Cost: $14/month total

Phase 4: Production (Future)
  - Add custom domain ($10/month)
  - Add database service ($15/month)
  - Add monitoring tools
  - Cost: ~$50-100/month total
```

---

## Next Steps

1. **Understand limitations** ← You just did ✅
2. **Deploy to free tier** - See MANUAL_DOCKER_SETUP.md
3. **Test features** - Create projects, test API
4. **Upgrade when needed** - See UPGRADE_TO_STARTER.md
5. **Go production** - See parent directory (DEPLOYMENT.md)

---

## Remember

✅ **Free tier is great for:**
- Learning
- Development
- Testing
- Demos

❌ **Free tier is NOT for:**
- Production
- Long-term data
- Critical business logic
- 24/7 availability needs

**Current plan**: Use free tier for development, upgrade to Starter when ready! 🚀
