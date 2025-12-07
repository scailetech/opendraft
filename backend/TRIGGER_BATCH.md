# How to Trigger Batch Processing (Simulate 2 AM UTC)

## Option 1: Trigger Single User (Recommended for Testing)

```bash
cd backend
modal run trigger_user.py
```

This will:
1. Find `f.deponte@yahoo.de` in the database
2. Verify they're verified and status is "waiting"
3. Trigger thesis generation via Modal
4. Send completion email when done

## Option 2: Trigger Full Batch

```bash
cd backend
modal run modal_worker.py
```

This simulates the full 2 AM UTC batch:
- Fetches all verified users with `status='waiting'`
- Processes up to 20 users in parallel
- Sends completion emails when ready

## Option 3: Via Modal Web Interface

1. Go to https://modal.com/apps
2. Find the `thesis-generator` app
3. Click on `process_single_user` function
4. Click "Run" and pass the user data as JSON

## What Happens Next

1. **Thesis Generation** (15-25 minutes):
   - 19 AI agents generate the thesis
   - Research, writing, citations, formatting
   - Creates PDF, DOCX, and ZIP files

2. **File Upload**:
   - Files uploaded to Supabase Storage
   - Signed URLs created (7-day expiry)

3. **Database Update**:
   - Status changed to "completed"
   - URLs saved to database

4. **Completion Email Sent**:
   - Email with PDF, DOCX, and ZIP download links
   - Academic honesty reminder included

## Monitor Progress

View logs in real-time:
```bash
modal app logs thesis-generator
```

Or check the Modal dashboard:
https://modal.com/apps/tech-opendraft/main/deployed/thesis-generator

