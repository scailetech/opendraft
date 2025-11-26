# Modal.com Deployment Guide - OpenDraft Thesis Generation

Complete deployment instructions for automated thesis generation service.

## Prerequisites

1. **Modal Account**: Sign up at https://modal.com
2. **Modal CLI**: Installed and authenticated (`modal token set --token-id xxx --token-secret xxx`)
3. **Supabase Project**: Created with URL and service role key
4. **Resend Account**: Email API key from https://resend.com
5. **Google Gemini API**: API key from https://aistudio.google.com/app/apikey

## Step 1: Supabase Database Setup

### 1.1 Run Schema Migration

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the entire contents of `/home/federicodeponte/academic-thesis-ai/website/lib/supabase/schema.sql`
3. Paste into SQL Editor
4. Click "Run"

**What this creates:**
- `waitlist` table (17 columns for user queue management)
- `referrals` table (viral loop tracking)
- `daily_processing_log` table (batch statistics)
- `thesis-files` storage bucket (PDF/DOCX files with RLS)
- Row Level Security (RLS) policies
- Automatic position calculation triggers

### 1.2 Verify Tables Created

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

Expected output:
- `waitlist`
- `referrals`
- `daily_processing_log`

### 1.3 Verify Storage Bucket

Go to Supabase Dashboard → Storage
- Bucket `thesis-files` should exist
- RLS policies enabled

## Step 2: Modal Secrets Setup

Create Modal secrets for environment variables:

```bash
# Supabase credentials
modal secret create supabase-credentials \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_KEY=your-service-role-key

# Gemini API key
modal secret create gemini-api-key \
  GOOGLE_API_KEY=your-gemini-api-key \
  GEMINI_API_KEY=your-gemini-api-key

# Resend email API
modal secret create resend-api-key \
  RESEND_API_KEY=re_your_resend_key
```

**Verify secrets created:**
```bash
modal secret list
```

## Step 3: Deploy to Modal

### 3.1 Navigate to Backend Directory

```bash
cd /home/federicodeponte/academic-thesis-ai/backend
```

### 3.2 Deploy Worker

```bash
modal deploy modal_worker.py
```

**Expected output:**
```
✓ Created app thesis-generator
✓ Mounted code from ../
✓ Installed system packages
✓ Installed Python packages
✓ Deployed function daily_thesis_batch
✓ Scheduled: Daily at 9:00 AM UTC

🎉 App deployed successfully!
View at: https://modal.com/apps/ap-xxxxx
```

### 3.3 Verify Deployment

```bash
modal app list
```

Expected:
- App name: `thesis-generator`
- Status: `deployed`
- Schedule: `0 9 * * *` (9am UTC daily)

## Step 4: Test Deployment

### 4.1 Add Test User to Waitlist

Use Supabase Dashboard → Table Editor → waitlist:

Insert test row:
```sql
INSERT INTO waitlist (
  email, full_name, thesis_topic, language, academic_level,
  status, email_verified, position, original_position
) VALUES (
  'test@example.com',
  'Test User',
  'Machine Learning for Climate Prediction',
  'en',
  'master',
  'waiting',
  true,
  1,
  1
);
```

### 4.2 Trigger Manual Run

```bash
modal run modal_worker.py
```

**Monitor output:**
- Should fetch 1 waiting user
- Start thesis generation
- Show progress (Research → Structure → Compose → Export)
- Upload PDF + DOCX to Supabase Storage
- Send completion email
- Mark user as `completed`

**Expected duration:** 20-30 minutes

### 4.3 Verify Results

**Check Supabase Storage:**
1. Go to Storage → thesis-files
2. Should see folder with user ID
3. Files: `thesis.pdf` and `thesis.docx`

**Check waitlist table:**
```sql
SELECT email, status, pdf_url, docx_url, completed_at
FROM waitlist
WHERE email = 'test@example.com';
```

Expected:
- `status`: `completed`
- `pdf_url`: Signed URL (7-day expiry)
- `docx_url`: Signed URL
- `completed_at`: Timestamp

**Check email:**
- Email sent to test@example.com
- Contains download links
- Links work and download thesis files

## Step 5: Monitor Production

### 5.1 View Logs

```bash
# Real-time logs
modal app logs thesis-generator

# Logs for specific run
modal run logs --app thesis-generator
```

### 5.2 Check Daily Stats

```sql
SELECT * FROM daily_processing_log
ORDER BY date DESC
LIMIT 7;
```

Shows:
- Date
- Processed count
- Failed count
- Completion timestamp

### 5.3 Monitor Queue

```sql
SELECT status, COUNT(*) as count
FROM waitlist
GROUP BY status;
```

Expected output:
- `waiting`: XXX users
- `processing`: 0-100 (during batch run)
- `completed`: XXX users
- `failed`: X users (retry manually)

## Troubleshooting

### Issue: "Module not found" error

**Cause:** Code mount path incorrect

**Fix:**
```python
# In modal_worker.py, verify:
code_mount = modal.Mount.from_local_dir(
    local_path="../",  # Correct: parent of backend/
    remote_path="/root/academic-thesis-ai"
)
```

### Issue: "GOOGLE_API_KEY not found"

**Cause:** Secret not created or wrong name

**Fix:**
```bash
# Recreate secret with both variable names
modal secret create gemini-api-key \
  GOOGLE_API_KEY=your-key \
  GEMINI_API_KEY=your-key
```

### Issue: Thesis generation times out (>1 hour)

**Cause:** API rate limits too aggressive

**Solution 1:** Increase Modal timeout
```python
@app.function(
    timeout=5400,  # 90 minutes
    ...
)
```

**Solution 2:** Process fewer users per batch
```python
.limit(50)  # Instead of 100
```

### Issue: "Rate limited (429)" errors

**Cause:** Hitting Semantic Scholar/CrossRef limits

**Fix:** Already increased delays to 5-60s in Phase 1.3
- Check logs for retry attempts
- If persistent, reduce batch size

### Issue: PDF generation fails

**Cause:** Missing system dependencies

**Fix:** Verify apt_install in modal_worker.py includes:
- libpango-1.0-0
- libpangocairo-1.0-0
- libgdk-pixbuf2.0-0

### Issue: Email not sending

**Cause:** Invalid Resend API key or domain not verified

**Fix:**
1. Verify domain in Resend dashboard
2. Check API key is correct
3. Update sender email to verified domain

## Cost Estimation

**Per thesis (estimated):**
- Modal compute: ~$0.05-0.10 (30 min CPU time)
- Gemini API: ~$0.35-1.00 (depends on model)
- Supabase storage: ~$0.00 (7-day retention)
- Resend email: ~$0.00 (free tier)

**Total per thesis:** ~$0.40-$1.10

**For 100 theses/day:**
- Daily cost: ~$40-110
- Monthly cost: ~$1,200-3,300

**Optimization tips:**
- Use gemini-2.5-flash (cheapest)
- Batch operations when possible
- Clean up old storage files after 7 days
- Monitor failed generations and retry manually

## Production Checklist

Before going live:

- [ ] Supabase schema migration run successfully
- [ ] All Modal secrets created and verified
- [ ] Test thesis generation completed end-to-end
- [ ] Email delivery working
- [ ] Storage upload/download verified
- [ ] Daily cron schedule confirmed (9am UTC)
- [ ] Landing page waitlist form pointing to Supabase
- [ ] Monitoring/alerting set up (optional)
- [ ] Cost alerts configured in Modal dashboard
- [ ] Backup plan for failed generations

## Next Steps

1. **Phase 6:** Update landing page to remove "Coming Soon" banners
2. **Testing:** Run 5-10 test theses to verify consistency
3. **Launch:** Announce service to waitlist
4. **Monitor:** Check logs daily for first week
5. **Optimize:** Adjust batch size based on success rate

## Support

- **Modal docs:** https://modal.com/docs
- **Supabase docs:** https://supabase.com/docs
- **OpenDraft issues:** https://github.com/federicodeponte/opendraft/issues

---

Generated for OpenDraft Modal deployment
Last updated: 2024-11-25
