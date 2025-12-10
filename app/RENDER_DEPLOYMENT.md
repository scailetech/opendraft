# OpenDraft Render Deployment Guide

## Architecture Overview

**Problem:** Modal.com was being used for thesis generation, causing:
- Limited logging visibility
- Complex debugging
- Export phase hanging for 20+ minutes

**Solution:** Deploy directly to Render (like bulk.run does), eliminating Modal dependency.

## Deployment Structure

### Service 1: opendraft-web (Next.js Frontend)
- **Runtime:** Node.js
- **Purpose:** Web UI + API routes
- **Timeout:** Standard (no long-running tasks here)
- **Build:** `npm install && npm run build`
- **Start:** `npm start`

### Service 2: opendraft-worker (Python Worker)
- **Runtime:** Docker
- **Purpose:** Polls database for pending theses and generates them
- **Timeout:** Unlimited (worker runs continuously)
- **Process:** Polls every 10 seconds for `status='pending'` theses
- **Dependencies:** Python 3.11, Pandoc, LaTeX, all thesis generator code

## Files Created

1. **render-opendraft.yaml** - Render service configuration
2. **Dockerfile.worker** - Docker image for Python worker
3. **worker-poller.py** - Poller script (replaces Modal)

## How It Works

```
User creates thesis → Supabase `theses` table (status='pending')
                    ↓
          Worker polls every 10s
                    ↓
        Thesis found → Mark as 'processing'
                    ↓
      Run ThesisGenerator.generate()
           (5-30 minutes)
                    ↓
    Update progress in database (real-time)
                    ↓
    Mark as 'completed' with PDF/DOCX paths
```

## Environment Variables Required

### opendraft-web
```
NODE_ENV=production
USE_RENDER_DIRECT=true
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
GEMINI_API_KEY=AIzaSyxxx
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyxxx
```

### opendraft-worker
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx
GEMINI_API_KEY=AIzaSyxxx
PROXY_LIST=(optional, for proxied research)
PYTHONUNBUFFERED=1
```

## Deployment Steps

### Option A: Via Render Dashboard (Simplest)
1. Go to https://dashboard.render.com
2. Click "New +" → "Blueprint"
3. Connect to GitHub repository: `opendraft`
4. Select `app/render-opendraft.yaml`
5. Configure environment variables
6. Deploy

### Option B: Via Render API
```bash
# Set API key
export RENDER_API_KEY=rnd_7JjDIe8AiW09V2FYriDT5maw8Y8q

# Create services via API (automated script below)
node deploy-to-render.js
```

### Option C: Manual Git Push
```bash
cd /Users/federicodeponte/opendraft
git add app/render-opendraft.yaml app/Dockerfile.worker app/worker-poller.py
git commit -m "Add Render deployment configuration"
git push origin main

# Then connect repository in Render dashboard
```

## Advantages Over Modal

1. **Better Logging**
   - Real-time logs in Render dashboard
   - Full stdout/stderr visibility
   - No "logs not loading" issues

2. **Simpler Architecture**
   - No Modal deployment needed
   - No Modal tokens/secrets to manage
   - Direct database polling (proven pattern)

3. **Cost-Effective**
   - Worker runs continuously (similar cost to Modal)
   - No cold starts
   - Same infrastructure as bulk.run

4. **Easier Debugging**
   - SSH into worker for debugging
   - Check logs anytime
   - Modify code and redeploy instantly

## Monitoring

### Check Worker Status
```bash
# View worker logs
https://dashboard.render.com/web/opendraft-worker/logs

# Worker should show:
# [2025-12-10 21:17:00] INFO - OpenDraft Worker Poller - STARTED
# [2025-12-10 21:17:00] INFO - Poll interval: 10s
# [2025-12-10 21:17:00] INFO - Gemini API key: ✓ Set
```

### Check Thesis Processing
```bash
# Database query
SELECT id, status, current_phase, progress, updated_at
FROM theses
WHERE status IN ('pending', 'processing')
ORDER BY created_at DESC;
```

## Troubleshooting

### Worker Not Picking Up Theses
- Check worker logs for errors
- Verify SUPABASE_SERVICE_KEY is correct
- Ensure `theses` table has RLS policy allowing service role

### PDF Generation Failing
- Check Pandoc/LaTeX installation in Docker logs
- Verify output directories exist (`/app/outputs`)
- Check system dependencies in Dockerfile.worker

### Worker Crashing
- Check memory usage (thesis generation can use 1-2GB)
- Increase worker instance size if needed
- Check for Python exceptions in logs

## Cost Estimate

- **opendraft-web:** ~$7/month (Starter plan)
- **opendraft-worker:** ~$7/month (Starter plan)
- **Total:** ~$14/month vs Modal's pay-per-use

## Next Steps

1. ✅ Configuration files created
2. ⏳ Deploy to Render (use Option A above)
3. ⏳ Test thesis generation end-to-end
4. ⏳ Monitor logs to verify logging improvements
5. ⏳ Deprecate Modal deployment once Render is stable

## Comparison: Before vs After

### Before (Modal)
```
User → Next.js API → Supabase (pending)
         ↓
   Modal poller (10s) → Modal function
         ↓
   Thesis generation (no logs visible)
         ↓
   Supabase (completed)
```

### After (Render)
```
User → Next.js API → Supabase (pending)
         ↓
   Render worker poller (10s)
         ↓
   Thesis generation (logs visible in Render dashboard!)
         ↓
   Supabase (completed)
```

---

**Status:** Ready to deploy
**Created:** December 10, 2025
**Author:** Claude Code
