# Railway Deployment Instructions

## Issue
The Railway token provided (`93050e7f-ef8e-41ad-87ae-6a59f3295d3b`) appears to be a project/service token, not a user API token. Railway CLI requires interactive login for user authentication.

## Solution Options

### Option 1: Manual Login (Recommended)
1. Run `railway login` (interactive browser login)
2. Run `railway init` to create/link project
3. Set environment variables:
   ```bash
   railway variables set GEMINI_API_KEY=AIzaSyDq6l8yzKncJRRkYLsJOjKIv3U4lXc9cM0
   railway variables set SUPABASE_URL=https://thurgehvjqrdmrjayczf.supabase.co
   railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodXJnZWh2anFyZG1yamF5Y3pmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY4NjY4MSwiZXhwIjoyMDc5MjYyNjgxfQ.iFAqYJ9B13W1Yq1PxwE0Bn1AtpQqAERl6waSIAeMn7I
   railway variables set NEXT_PUBLIC_SUPABASE_URL=https://thurgehvjqrdmrjayczf.supabase.co
   ```
4. Deploy: `railway up`

### Option 2: Use Railway Web UI
1. Go to https://railway.app
2. Create new project
3. Connect GitHub repo or upload files
4. Set environment variables in dashboard
5. Deploy

### Option 3: Railway API (if you have proper API token)
The token format suggests it might be a project ID. To get a proper API token:
1. Go to Railway dashboard → Settings → Tokens
2. Create new API token
3. Use that token with Railway CLI

## Files Ready for Deployment
- ✅ `main_railway.py` - Railway-compatible FastAPI app
- ✅ `requirements_railway.txt` - Dependencies
- ✅ `Procfile` - Start command
- ✅ `railway.json` - Configuration

## Quick Deploy (After Login)
```bash
cd /Users/federicodeponte/bulkgpt-01122025/FedeProject/modal-processor
railway login
railway init --name bulk-gpt-processor-railway
railway variables set GEMINI_API_KEY=AIzaSyDq6l8yzKncJRRkYLsJOjKIv3U4lXc9cM0
railway variables set SUPABASE_URL=https://thurgehvjqrdmrjayczf.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodXJnZWh2anFyZG1yamF5Y3pmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY4NjY4MSwiZXhwIjoyMDc5MjYyNjgxfQ.iFAqYJ9B13W1Yq1PxwE0Bn1AtpQqAERl6waSIAeMn7I
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://thurgehvjqrdmrjayczf.supabase.co
railway up
```

