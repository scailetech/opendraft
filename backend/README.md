# Backend - Modal.com Draft Generation Worker

This directory contains the Modal.com serverless worker that automatically generates theses daily.

## Setup

### 1. Install Modal CLI

```bash
pip install modal
modal setup
```

This will authenticate you with Modal (one-time setup).

### 2. Create Modal Secrets

Add your credentials to Modal's secret management:

```bash
# Supabase credentials
modal secret create supabase-credentials \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_KEY=your-service-role-key

# Gemini API key
modal secret create gemini-api-key \
  GEMINI_API_KEY=your-gemini-api-key

# Resend API key
modal secret create resend-api-key \
  RESEND_API_KEY=your-resend-api-key
```

### 3. Deploy Worker

```bash
modal deploy modal_worker.py
```

This will:
- Deploy the scheduled function (runs daily at 9am UTC)
- Create persistent volume for temporary files
- Set up all dependencies

### 4. Test Locally

```bash
modal run modal_worker.py
```

This runs the batch processor once immediately (for testing).

## How It Works

1. **Daily Trigger**: Runs at 9am UTC every day
2. **Fetch Queue**: Gets next 100 waiting users (FIFO, email verified)
3. **Generate Draft**: Runs your OpenDraft code for each user
4. **Upload Files**: Stores PDF/DOCX in Supabase Storage
5. **Update Database**: Marks draft as completed, stores signed URLs
6. **Send Email**: Notifies user with download links

## Integration with OpenDraft

Replace the `generate_draft_placeholder()` function with your actual draft generation code:

```python
from opendraft_ai import DraftGenerator

def generate_draft_placeholder(topic: str, language: str, academic_level: str):
    generator = DraftGenerator(model="gemini-2.5-flash")
    result = generator.generate(
        topic=topic,
        language=language,
        academic_level=academic_level
    )
    return result.pdf_path, result.docx_path
```

## Monitoring

View logs in real-time:

```bash
modal app logs draft-generator
```

## Cost Estimate

- **Modal compute**: ~$0-30/month (within free tier for 100 jobs/day × 10 min)
- **Gemini API**: $0 (free tier: 1,500 requests/day)
- **Total**: ~$0-30/month

## Troubleshooting

**Error: "Secret not found"**
- Run `modal secret list` to verify secrets exist
- Recreate with commands above

**Error: "Permission denied"**
- Check Supabase service role key has correct permissions
- Verify storage bucket exists

**Files not uploading:**
- Check storage bucket name is 'draft-files'
- Verify RLS policies allow service role to upload

## Performance Optimization

### Proxy Support for Citation Research

To bypass API rate limits and maximize research speed during draft generation:

#### 1. Get Proxies

Obtain residential or datacenter proxies from your provider:
- Smartproxy, Oxylabs, BrightData, etc.
- Format: `host:port:username:password`
- Recommended: 5-10 proxies for optimal rotation

#### 2. Configure Environment

Add to `.env.local`:

```bash
# Proxy rotation for citation research (bypasses rate limits)
PROXY_LIST=proxy1.com:8080:user:pass,proxy2.com:8080:user:pass

# Maximum parallelism (recommended: 32+ with proxies, 4 without)
SCOUT_PARALLEL_WORKERS=32

# Batch size (process all 60 queries at once with proxies)
SCOUT_BATCH_SIZE=60

# Minimal delay with proxy rotation
SCOUT_BATCH_DELAY=0.1
```

#### 3. Performance Gains

| Configuration | Research Time | Worker Count | Rate Limits |
|---------------|--------------|--------------|-------------|
| **Without Proxies** | ~8-12 minutes | 4 workers | 429 errors, backoff delays |
| **With Proxies** | ~1-2 minutes | 32 workers | None |

**Total Speedup**: ~8-10x faster for research phase

#### 4. How It Works

**Without Proxies** (Current Default):
- 4 parallel workers
- Batch size: 15 queries
- 4 batches with 0.5s delays
- Crossref/Semantic Scholar rate limits apply
- Total: ~10 minutes

**With Proxies** (Optimized):
- 32 parallel workers
- Batch size: 60 queries (all at once)
- No delays (proxies bypass rate limits)
- Each query hits 3 APIs simultaneously
- Total: ~1-2 minutes

#### 5. Verification

Check logs for proxy usage:

```bash
# Should see:
# INFO: Loaded 5 proxies for rotation
# 🔀 Proxy rotation enabled: 5 proxies
# Batch delays disabled for maximum throughput
```

#### 6. Troubleshooting

**Proxies not working:**
- Verify format: `host:port:user:pass`
- Check proxy credentials are valid
- Test with single proxy first

**Still seeing rate limits:**
- Increase proxy count (minimum 5 recommended)
- Verify proxies are rotating (check API logs)
- Some proxies may be blocked - rotate them out
