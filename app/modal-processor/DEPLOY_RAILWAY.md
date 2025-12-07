# Deploy to Railway

## Quick Deploy

1. **Login to Railway** (interactive):
   ```bash
   railway login
   ```

2. **Initialize project** (if new):
   ```bash
   railway init
   ```
   Or link to existing project:
   ```bash
   railway link
   ```

3. **Set environment variables** in Railway dashboard or via CLI:
   ```bash
   railway variables set GEMINI_API_KEY=your-key
   railway variables set SUPABASE_URL=your-url
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your-key
   railway variables set NEXT_PUBLIC_SUPABASE_URL=your-url
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

5. **Get URL**:
   ```bash
   railway domain
   ```

## Files Created

- `main_railway.py` - Railway-compatible FastAPI app (uses ThreadPoolExecutor instead of Modal)
- `requirements_railway.txt` - Python dependencies
- `Procfile` - Railway start command
- `railway.json` - Railway configuration

## Differences from Modal Version

- Uses `ThreadPoolExecutor` for parallel processing (vertical scaling)
- Standard FastAPI app (no Modal decorators)
- Background tasks via FastAPI's `BackgroundTasks`
- Same functionality, simpler deployment

## Testing

After deployment, test with:
```bash
curl https://your-railway-url.railway.app/health
```

