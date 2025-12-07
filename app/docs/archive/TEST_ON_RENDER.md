# Test 1000 Rows on Render

## Quick Test

**Option 1: Use the test script**
```bash
./test_render_1k.sh
# Enter your Render URL when prompted
```

**Option 2: Direct curl**
```bash
curl -X POST https://your-app.onrender.com/api/test-batch-direct \
  -H 'Content-Type: application/json' \
  -d '{
    "rowCount": 1000,
    "prompt": "Find information about {{company}}. What industry are they in?"
  }' \
  --max-time 600
```

## What Gets Tested

- ✅ 1000 rows processed in parallel
- ✅ Web-search tool (googleSearch)
- ✅ URL-context tool (urlContext)
- ✅ Two-phase processing (tools → structured JSON)
- ✅ Performance metrics

## Expected Results

- **Total time**: ~5-10 minutes
- **Success rate**: >95%
- **Throughput**: ~100-200 rows/second
- **Tokens**: ~500-1000 per row

## Local vs Render

**Local testing is similar** - same Node.js runtime, same code. If it works locally, it should work on Render.

**To test locally first:**
```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/test-batch-direct \
  -H 'Content-Type: application/json' \
  -d '{"rowCount": 10, "prompt": "What is {{company}}?"}'
```

Then test on Render with 1000 rows!

