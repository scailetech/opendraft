# OpenDraft - Local Development Guide

## 🚀 NO MORE MODAL! Run 100% Locally on Your Mac

This guide shows you how to run the complete OpenDraft thesis generator entirely on your Mac, with no Modal dependency.

### Architecture

```
Terminal 1: Next.js UI          Terminal 2: Python Worker
     ↓                                  ↓
http://localhost:3000           Polls Supabase every 10s
     ↓                                  ↓
Creates thesis (status='pending') → Worker picks it up
                                        ↓
                                  Runs thesis_generator.py
                                        ↓
                                  Updates progress in DB
                                        ↓
                                  UI shows real-time progress!
```

### Prerequisites

- Python 3.9+ installed
- Node.js 18+ installed
- Pandoc + LaTeX installed (for PDF generation)

### Setup

#### 1. Install Python Dependencies

```bash
cd /Users/federicodeponte/opendraft
pip3 install -r requirements.txt
```

#### 2. Install Pandoc + LaTeX (if not already installed)

```bash
# macOS
brew install pandoc
brew install basictex

# After installing basictex, install required packages
sudo tlmgr update --self
sudo tlmgr install collection-fontsrecommended
sudo tlmgr install xetex
```

#### 3. Environment Variables

Make sure `app/.env.local` has:

```bash
# Supabase
SUPABASE_URL=https://rnuiiqgkytwmztgsanng.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx  # Your service role key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

# Gemini API
GEMINI_API_KEY=AIzaSyxxx
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyxxx

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Running Locally

#### Terminal 1: Start Next.js Frontend

```bash
cd /Users/federicodeponte/opendraft/app
npm run dev
```

→ Open http://localhost:3000

#### Terminal 2: Start Python Worker

```bash
cd /Users/federicodeponte/opendraft
./app/dev-worker.sh
```

You'll see:
```
🚀 Starting OpenDraft Local Worker...
✅ Loaded environment from app/.env.local
🔄 Worker will poll for pending theses every 10 seconds...
```

### Creating a Test Thesis

In the UI:
1. Go to http://localhost:3000/write
2. Enter a topic (e.g., "AI in Healthcare")
3. Click "Generate Thesis"
4. Watch Terminal 2 - You'll see the worker pick it up!

```
[2025-12-10 20:00:00] INFO - Processing thesis: abc-123
[2025-12-10 20:00:00] INFO -    Topic: AI in Healthcare
[2025-12-10 20:00:01] INFO - [abc-123] Starting thesis generation...
[2025-12-10 20:05:30] INFO - [abc-123] Research phase: 5.5 minutes
[2025-12-10 20:08:00] INFO - [abc-123] Writing phase: 2.5 minutes
[2025-12-10 20:10:00] INFO - [abc-123] Export complete!
```

### Benefits of Local Development

✅ **Full Logging** - See every step in your terminal  
✅ **Fast Iteration** - Edit code, worker picks up changes  
✅ **No Deploy** - No Modal deployment needed  
✅ **Debugging** - Add breakpoints, print statements  
✅ **Cost** - $0 for development  
✅ **Real-Time Progress** - UI updates via Supabase subscription

### Deployment to Render (Production)

When ready for production, follow `RENDER_DEPLOYMENT.md` to deploy both:
- Next.js frontend
- Python worker (long-running background process)

Both run on Render with the same architecture!

### Troubleshooting

**Worker not picking up theses?**
- Check Supabase credentials in `app/.env.local`
- Verify `SUPABASE_SERVICE_KEY` is set (not just `SUPABASE_ANON_KEY`)
- Check database - is status = 'pending'?

**Worker crashes immediately?**
- Run `python3 --version` - should be 3.9+
- Check logs in `/Users/federicodeponte/opendraft/logs/worker.log`

**Thesis generation fails?**
- Check Gemini API key is valid
- Verify Pandoc is installed: `pandoc --version`
- Check LaTeX is installed: `xelatex --version`

### Files Changed (Modal Removal)

- ✅ `app/api/thesis/generate/route.ts` - Removed Modal trigger
- ✅ `app/api/thesis/trigger-modal/route.ts` - Deleted
- ✅ `app/worker-poller.py` - Local worker (polls database)
- ✅ `app/dev-worker.sh` - Startup script for local development

---

**Need help?** Check `/tmp/worker.log` for detailed error messages.
