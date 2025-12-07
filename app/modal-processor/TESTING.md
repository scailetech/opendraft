# Testing Railway Processor

## Local Testing

### 1. Start the server locally:
```bash
cd /Users/federicodeponte/bulkgpt-01122025/FedeProject/modal-processor
python3 main_railway.py
```

### 2. Run tests (in another terminal):
```bash
# Quick test suite
python3 test_railway.py

# Or bash script
./test_large_batch.sh
```

## Testing on Railway (After Deployment)

### 1. Get your Railway URL:
```bash
railway domain
# Or check Railway dashboard
```

### 2. Test deployed instance:
```bash
export RAILWAY_URL=https://your-app.railway.app
python3 test_railway.py

# Or use the script
./test_railway_deployed.sh
```

## Test Scenarios

### ✅ Small Batch (10 rows)
- **Expected**: Accepts immediately, processes in ~20 seconds
- **Test**: `python3 test_railway.py` (selects small batch)

### ✅ Medium Batch (100 rows)  
- **Expected**: Accepts immediately, processes in ~3-4 minutes
- **Test**: Included in test suite

### ✅ Large Batch (1000 rows)
- **Expected**: Accepts immediately, processes in ~30-40 minutes
- **Test**: Run test suite and select "y" for very large batch

## Performance Expectations

**Vertical Scaling (Railway):**
- Single instance handles 1000+ concurrent requests
- Uses ThreadPoolExecutor (1000 max workers)
- Processing time: ~2 seconds per row (parallel)
- 1000 rows ≈ 2000 seconds ≈ 33 minutes

**Comparison to Modal:**
- Modal: Horizontal scaling (spawns containers)
- Railway: Vertical scaling (single instance, more workers)
- Both handle large batches, different scaling approach

## Monitoring

Check Supabase for results:
```sql
SELECT * FROM batches WHERE id LIKE 'test-batch-%' ORDER BY created_at DESC;
SELECT * FROM batch_results WHERE batch_id = 'your-batch-id';
```

## Troubleshooting

**Server not responding:**
- Check Railway logs: `railway logs`
- Verify environment variables are set
- Check Railway service is running

**Batch not processing:**
- Check Supabase connection
- Verify GEMINI_API_KEY is valid
- Check Railway logs for errors

**Slow processing:**
- Normal for large batches (1000 rows = ~30 min)
- Check Railway resource allocation (CPU/memory)
- Consider increasing Railway instance size

