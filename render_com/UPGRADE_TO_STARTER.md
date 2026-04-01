# Upgrade from Free to Starter Tier

When you're ready for persistent data and always-on service, upgrade to Render's Starter plan.

---

## Why Upgrade?

| Feature | Free | Starter |
|---------|------|---------|
| **Cost** | $0 | $7/service/month |
| **Persistent Disk** | ❌ None | ✅ 1GB |
| **Data Survival** | ❌ Lost on restart | ✅ Persists |
| **Service Sleep** | 15 min idle | ✅ Always on |
| **First Request Speed** | 20-30s (after wake) | Instant |
| **CPU/Memory** | Shared | Dedicated |

**Cost for ProjectsTracker**: $7 × 2 services = $14/month

---

## How to Upgrade Backend

### Step 1: Open Service Settings

```
Render Dashboard:
  → projectstracker-api
    → Settings tab
```

### Step 2: Change Plan

Look for **Plan** section:

```
Plan: Free        ← Click this
  ↓
[Select Plan]
  ├─ Free ($0)
  ├─ Starter ($7/month)  ← SELECT THIS
  ├─ Standard
  └─ Pro
```

Click **Starter**

### Step 3: Add Persistent Disk (If Not Already There)

Scroll down to **Disk** section:

```
Disks:
  [+ Add Disk]
  
OR (if disk exists):
  sqlite-data    1 GB    /app/data    [×]
```

If you need to add disk:

```
[+ Add Disk]
  Name: sqlite-data
  Size: 1 GB
  Mount Path: /app/data
  
  [Add]
```

### Step 4: Save

Look for **Save** or **Update** button at bottom

Click it

### Step 5: Confirm Billing

Render might ask for billing confirmation:

```
Upgrade to Starter?
Cost: $7/month

This will be charged to your account.
[Confirm] [Cancel]
```

Click **Confirm**

---

## How to Upgrade Frontend

Same steps, but for **projectstracker-frontend** service:

```
Render Dashboard:
  → projectstracker-frontend
    → Settings
    → Plan: Free → Starter
    → [Save]
```

Frontend doesn't need persistent disk (it's stateless), but upgrade plan for always-on service.

---

## What Happens After Upgrade

### Immediate Changes

```
1. Payment method charged ($7 per service)
2. Service plan updates to Starter
3. Service redeploys (1-2 minutes downtime)
4. (If you added disk: disk is created)
```

### Backend Gets Persistent Disk

```
/app/data/database.sqlite
  → Now persists across:
     - Service restarts
     - Redeployments  
     - Manual restarts
  → Data is safe! ✅
```

### Both Services No Longer Sleep

```
- No 15-minute sleep timeout
- Always responsive
- First request is instant
- Perfect for production
```

---

## Verify Upgrade Worked

### Check Plan

```
Render Dashboard:
  → projectstracker-api
    → Settings
    → Plan should show: Starter
```

### Check Disk

```
Render Dashboard:
  → projectstracker-api
    → Disk tab
    → Should show: sqlite-data 1GB
```

### Test Data Persistence

1. Login to app
2. Create a project
3. In Render Dashboard, click **Manual Deploy** on backend
4. Wait for service to restart
5. Open app again
6. Project should still be there! ✅

---

## Monthly Cost

### Backend Only (Starter)
```
projectstracker-api:  $7/month
Total:                $7/month
```

### Backend + Frontend (Both Starter)
```
projectstracker-api:      $7/month
projectstracker-frontend: $7/month
Total:                   $14/month
```

**Compare to free tier**: $0 → $14/month is a big jump, but you get production-ready infrastructure!

---

## Payment Methods Accepted

- Credit card (Visa, Mastercard, Amex)
- Debit card
- PayPal

Render handles billing automatically (charged monthly).

---

## Scaling Beyond Starter (Future)

If your app grows:

| Plan | Cost | Use Case |
|------|------|----------|
| Free | $0 | Dev/testing |
| Starter | $7/service | Production small apps |
| Standard | $25/service | Growing apps |
| Pro | $100/service | High-traffic apps |

You can upgrade anytime without code changes!

---

## Downgrade Back to Free (Not Recommended)

If you want to downgrade (save money):

```
Render Dashboard:
  → Service
    → Settings
    → Plan: Starter → Free
    → [Save]
```

**But**: You'll lose the persistent disk and data will be reset!

Only downgrade if you don't need the data anymore.

---

## How to Cancel (Stop Paying)

If you no longer need the service:

```
Render Dashboard:
  → Service
    → Settings
    → Danger Zone
    → [Delete Service]
    
  Confirm deletion
  
  No more charges! ✅
```

---

## Troubleshooting Upgrade

### Issue: "Upgrade Failed"

**Check**:
1. Billing method on file?
2. Card details correct?
3. Sufficient credit limit?

**Fix**:
```
Render Dashboard:
  → Account Settings
    → Billing
    → Update payment method
```

### Issue: Disk Didn't Get Created

**Check**:
```
Render Dashboard:
  → projectstracker-api
    → Disk tab
    → Should show: sqlite-data 1GB
```

If missing:
```
1. Settings tab
2. Scroll to "Disks"
3. [+ Add Disk]
4. Name: sqlite-data
5. Size: 1GB
6. Mount: /app/data
7. [Add]
```

### Issue: Still Have the Same Issues

**Check**:
1. Did upgrade actually complete?
2. Are you using the new plan?
3. Did service redeploy?

**Force Redeploy**:
```
Render Dashboard:
  → Service
    → Settings
    → [Manual Deploy]
```

---

## After Upgrade: Recommended Actions

### 1. Test Data Persistence

```
1. Create a project
2. Take note of details
3. Manual restart backend
4. Verify project still exists ✅
```

### 2. Update CORS_ORIGIN (Optional)

If you have a custom domain, update CORS:

```
Render Dashboard:
  → projectstracker-api
    → Environment
    → CORS_ORIGIN: https://yourdomain.com
    → Save
```

### 3. Monitor Costs

```
Render Dashboard:
  → Account Settings
    → Billing
    → Usage & billing
    → See monthly charges
```

### 4. Set Up Monitoring (Optional)

```
Render Dashboard:
  → Service
    → Alerts
    → Set up email notifications
```

---

## Budget Planning

### Per Month

```
2 services × $7 = $14/month

Plus (if added):
- Custom domain: +$10/month
- Database service: +$15/month
- Other services: +varies

Total possible: $40-100/month depending on features
```

### Per Year

```
14 services × 12 months = $168/year

Less expensive than:
- AWS EC2 ($10-50/month minimum)
- Heroku ($25/month minimum per service)
- DigitalOcean ($4-12/month minimum)
```

---

## Is Starter Worth It?

### Yes, upgrade if:
✅ You have real users  
✅ You need data persistence  
✅ You want 24/7 uptime  
✅ You're past testing phase  
✅ You can afford $14/month  

### Stay on Free if:
✅ Still testing/developing  
✅ Demo for stakeholders  
✅ Learning purposes  
✅ Budget is limited  

---

## Future Upgrades

You can upgrade again later without issues:

```
Starter → Standard: No data loss
Standard → Pro: No data loss
(Same code runs, just more resources)
```

Easy migration path! 🚀

---

## Need Help?

- **Billing Questions**: Render Support (render.com/support)
- **Technical Issues**: See TROUBLESHOOTING.md
- **Plan Features**: See render.com/docs

---

## Summary

```
1. Render Dashboard → Service → Settings
2. Plan: Free → Starter
3. Add Disk (1GB) if needed
4. [Save]
5. Confirm billing
6. Wait 2 minutes for restart
7. Data now persists! ✅
```

Ready to go production? Upgrade now! 🚀
