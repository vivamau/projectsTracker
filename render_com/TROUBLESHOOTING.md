# Render.com Free Tier - Troubleshooting Guide

## Common Issues & Solutions

### Issue 1: "Build Failed" Error

**Symptoms**:
- Service shows "Build failed"
- Deploy won't complete
- Logs show error messages

**Common Causes**:
1. Dockerfile syntax error
2. Missing file referenced in Dockerfile
3. npm module not found
4. Port conflict

**Solutions**:

1. **Check Logs**:
   ```
   Render Dashboard:
     → Service name
     → Logs tab
     → Read error message
   ```

2. **Fix the Code**:
   - If Dockerfile error: edit `backend/Dockerfile` or `frontend/Dockerfile`
   - If missing file: ensure file exists in repository
   - If npm error: run `npm install` locally and check `package.json`

3. **Redeploy**:
   ```bash
   git add .
   git commit -m "Fix build issue"
   git push origin main
   
   # Render auto-redeploys
   ```

4. **Manual Redeploy** (if auto-deploy doesn't trigger):
   ```
   Render Dashboard:
     → Service
     → Settings
     → Manual Deploy
   ```

---

### Issue 2: "Service Won't Start" / Health Check Failed

**Symptoms**:
- Service shows building, then fails
- Logs show "Health check failed"
- Service restarts repeatedly

**Common Causes**:
1. Port already in use
2. Database migration failed
3. Environment variable missing
4. Server crash on startup

**Solutions**:

1. **Check Environment Variables**:
   ```
   Render Dashboard:
     → Service
     → Environment tab
     → Verify all required vars are set
   ```

2. **Check Logs for Specific Error**:
   ```
   Render Dashboard:
     → Service
     → Logs tab
     → Look for: "Error:", "failed", "cannot find"
   ```

3. **For Backend Service**:
   - Check: `NODE_ENV=production`
   - Check: `PORT=5000`
   - Check: `DB_PATH=/tmp/database.sqlite`

4. **Wait for Migrations**:
   - First startup takes longer (30-40 seconds)
   - Database migrations are running
   - Let it finish before declaring failure

5. **Manual Restart**:
   ```
   Render Dashboard:
     → Service
     → Settings
     → Manual Deploy
   ```

---

### Issue 3: Frontend Can't Connect to Backend (API Calls Fail)

**Symptoms**:
- Frontend loads OK
- Login page appears
- Click login → error "Cannot reach server"
- Or: Network tab shows API call to wrong URL

**Common Causes**:
1. `BACKEND_URL` env var is wrong
2. Backend service is not "Live"
3. Nginx proxy misconfigured

**Solutions**:

1. **Verify Backend is Running**:
   ```
   Render Dashboard:
     → projectstracker-api
     → Check status: should be "Live"
   ```

2. **Check BACKEND_URL in Frontend**:
   ```
   Render Dashboard:
     → projectstracker-frontend
     → Environment tab
     → Find: BACKEND_URL
     → Should be: https://projectstracker-api.onrender.com
   ```

3. **If Backend Name is Different**:
   - If you named backend differently (not "projectstracker-api")
   - Then URL will be: `https://{your-service-name}.onrender.com`
   - Update BACKEND_URL in frontend environment

4. **Test API Directly**:
   ```bash
   # Test backend health
   curl https://projectstracker-api.onrender.com/health
   
   # Should return: {"status":"ok",...}
   
   # If fails: backend is not running
   # Check backend service in Render Dashboard
   ```

5. **Check Frontend Logs**:
   ```
   Render Dashboard:
     → projectstracker-frontend
     → Logs tab
     → Look for: "substituting BACKEND_URL"
     → Should show: "BACKEND_URL = https://projectstracker-api.onrender.com"
   ```

6. **Update BACKEND_URL & Redeploy**:
   ```
   Render Dashboard:
     → projectstracker-frontend
     → Environment
     → Click BACKEND_URL
     → Edit value (make sure it's correct)
     → Save
     → Service auto-redeploys
   ```

---

### Issue 4: "Cannot GET /" on Frontend

**Symptoms**:
- Open frontend URL
- Browser shows: "Cannot GET /"
- Or: 404 error

**Common Causes**:
1. Nginx not starting
2. React app not built
3. Dockerfile issue

**Solutions**:

1. **Check Frontend Logs**:
   ```
   Render Dashboard:
     → projectstracker-frontend
     → Logs tab
     → Look for: "Nginx starting" or error
   ```

2. **Check if Build Completed**:
   ```
   Logs should show:
   - "npm run build" completed
   - "Nginx listening on port 80"
   ```

3. **If Build Failed**:
   - See "Issue 1: Build Failed" above
   - Check `frontend/` folder for errors
   - Rebuild locally: `npm run build`

4. **Restart Service**:
   ```
   Render Dashboard:
     → projectstracker-frontend
     → Settings
     → Manual Deploy
   ```

---

### Issue 5: "Login Works But Features Don't Work"

**Symptoms**:
- Can login successfully
- Dashboard loads
- Click "Projects" or other feature → error
- Or: API calls hang/timeout

**Common Causes**:
1. Backend database issue
2. Backend crashed
3. API endpoint error

**Solutions**:

1. **Check Backend is Still Running**:
   ```
   Render Dashboard:
     → projectstracker-api
     → Should still be "Live"
   ```

2. **Check Backend Logs**:
   ```
   Render Dashboard:
     → projectstracker-api
     → Logs tab
     → Look for recent errors
   ```

3. **Check Frontend Network Calls**:
   ```
   Browser DevTools (F12):
     → Network tab
     → Try the failing feature
     → Look at the API request
     → Check Response: is it an error?
   ```

4. **Restart Backend**:
   ```
   Render Dashboard:
     → projectstracker-api
     → Settings
     → Manual Deploy
   ```

---

### Issue 6: "Service is Very Slow After Not Using It"

**Symptoms**:
- App works fine at first
- Don't use app for 20+ minutes
- Next request takes 20-30 seconds
- Then it's fast again

**This is Expected on Free Tier!**

**Explanation**:
- Free tier services sleep after 15 minutes of idle time
- First request after sleep wakes up the service (~20-30s)
- Subsequent requests are fast
- This is normal behavior

**Solutions**:
- **Accept it** (it's free, after all!)
- **Upgrade to Starter** (always-on, no sleep)
- See: UPGRADE_TO_STARTER.md

---

### Issue 7: "Data Disappeared After Restart"

**Symptoms**:
- Had created projects, data was there
- Service restarted or you clicked "Manual Deploy"
- Now database is empty
- All data is gone

**This is Expected on Free Tier!**

**Explanation**:
- Free tier has no persistent disk
- SQLite stored in `/tmp` (temporary directory)
- When service restarts, `/tmp` is cleared
- All data is lost

**Solutions**:
- **Accept it** (it's a free tier limitation)
- **Upgrade to Starter** (adds persistent disk)
- See: UPGRADE_TO_STARTER.md

**Preventing Data Loss**:
- Only use free tier for testing/development
- Don't rely on persistent data
- Upgrade when you need real data persistence

---

### Issue 8: "Service Keeps Restarting"

**Symptoms**:
- Service shows as "Building" repeatedly
- Or: Restarts every few seconds
- Can't reach the service

**Common Causes**:
1. Application crash on startup
2. Out of memory
3. Port conflict
4. Infinite loop in code

**Solutions**:

1. **Check Logs**:
   ```
   Render Dashboard:
     → Service
     → Logs tab
     → Look for crash message or loop
   ```

2. **Check Environment Variables**:
   - Verify all required vars are set
   - Check for typos in values

3. **Check Code for Issues**:
   - Run locally: `npm start`
   - Check if it runs without crashing
   - Fix any errors locally
   - Push to GitHub
   - Render will redeploy

4. **Check Disk Space** (unlikely on free tier):
   - Usually won't be an issue
   - But if everything fails, this could be it

---

### Issue 9: "Can Login But Sessions Don't Persist"

**Symptoms**:
- Login works
- Page refreshes → logged out
- Or: Navigate to different page → lose session

**This Would Indicate**:
- Session cookie not being set properly
- Or: CORS issue

**Solutions**:

1. **Check DevTools - Application Tab**:
   ```
   Browser DevTools (F12):
     → Application tab
     → Cookies
     → Look for: "token" cookie
     → Should exist after login
   ```

2. **Check CORS Setting**:
   ```
   Render Dashboard:
     → projectstracker-api
     → Environment
     → CORS_ORIGIN should be frontend URL
   ```

3. **Check Backend Logs for CORS Error**:
   ```
   Render Dashboard:
     → projectstracker-api
     → Logs
     → Look for: "CORS" or "origin" errors
   ```

4. **Verify Frontend Uses Correct Domain**:
   - All API calls should be to: `/api/...`
   - NOT to absolute URLs
   - Nginx proxy handles it

---

## Debugging Checklist

When something doesn't work:

- [ ] Check service shows "Live" status
- [ ] Check logs for error messages
- [ ] Verify environment variables are set
- [ ] Test API directly with `curl`
- [ ] Check browser DevTools (Network, Console, Application tabs)
- [ ] Try Manual Restart/Redeploy
- [ ] Check if code was pushed to GitHub
- [ ] Read error messages carefully!

---

## Log Reading Tips

### Where to Find Logs

```
Render Dashboard:
  → Service name
    → Logs tab
    → Newest messages at the bottom
    → Scroll up for older messages
```

### What to Look For

```
✅ Good signs:
  - "Listening on port 5000"
  - "Health check passing"
  - "Server running"
  - "Nginx listening on port 80"
  - "Database initialized"

❌ Bad signs:
  - "Error:"
  - "FATAL"
  - "Cannot connect to"
  - "Port already in use"
  - "Failed to"
```

---

## Still Stuck?

1. **Re-read the relevant guide**:
   - DOCKER_SERVICE_SETUP_BACKEND.md (backend issues)
   - DOCKER_SERVICE_SETUP_FRONTEND.md (frontend issues)

2. **Check FREE_TIER_OVERVIEW.md** for limitations

3. **Look at actual logs** (most helpful)

4. **Try restarting the service** (fixes many issues)

5. **Consider upgrading to Starter** (fixes persistence/sleep issues)

---

Good luck! Most issues are easy to fix once you identify the cause. 🚀
