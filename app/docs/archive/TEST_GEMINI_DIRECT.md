# Test Direct Gemini SDK Calls

## Render Timeout Limits
- **Render**: 100 minutes timeout ✅ (Perfect for batch processing!)
- Much better than Vercel's 5 minutes
- No need for Modal/Railway for most batches!

## Test Endpoint

**Created:** `/api/test-gemini-direct`

### Test Single Call
```bash
curl -X POST http://localhost:3000/api/test-gemini-direct \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "What is 2+2?"}'
```

### Test Parallel Calls (5 at once)
```bash
curl -X POST http://localhost:3000/api/test-gemini-direct \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "What is 2+2?", "testRows": 5}'
```

### Test Large Batch (100 parallel)
```bash
curl -X POST http://localhost:3000/api/test-gemini-direct \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "What is 2+2?", "testRows": 100}'
```

## What It Tests

1. ✅ Direct Gemini API calls from Render
2. ✅ Parallel processing (multiple calls at once)
3. ✅ Response time per call
4. ✅ Token usage
5. ✅ Error handling

## Expected Results

- **Single call**: ~2-3 seconds
- **100 parallel calls**: ~30-40 seconds
- **1000 parallel calls**: ~5-6 minutes (within Render's 100 min limit!)

## Next Steps

1. Test the endpoint locally
2. Test on Render deployment
3. If it works, we can replace Modal/Railway with direct processing!

## Why This Works

- Render has 100 minute timeout (plenty of time)
- Gemini API calls are fast (~2-3 seconds each)
- Parallel processing works great in Node.js
- No need for external services!

