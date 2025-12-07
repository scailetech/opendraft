# OpenDraft App - AI Thesis Writer

## About This App

This is **app.opendraft.xyz** - a self-service thesis writing interface.

**Base**: Copied from `openaeomachine` (AEO Machine)  
**Purpose**: Let users write their thesis directly in the app with real-time progress tracking

## Current Status

✅ **Base app copied** from openaeomachine  
✅ **Navigation simplified**: WRITE → CONTEXT → LOG → SETTINGS  
🔄 **In Progress**: Adapting BlogGenerator → ThesisWriter  
⏳ **Todo**: Connect to Modal backend  
⏳ **Todo**: Add progress tracking UI  
⏳ **Todo**: Deploy to app.opendraft.xyz  

## Key Differences from Main Website

### Main Website (opendraft.xyz)
- Marketing site
- Waitlist signup
- Email-based thesis delivery
- No user login required

### App (app.opendraft.xyz)  
- Authenticated app
- Direct thesis writing interface
- Real-time progress tracking
- Milestone streaming
- Download thesis instantly
- View history of past theses

## Architecture

```
app.opendraft.xyz (Next.js)
   ↓ API call
Modal Backend (thesis-generator)
   ↓ saves to
Supabase (waitlist table)
   ↓ polls for
Progress & Results
   ↓ displays in
Real-time UI
```

## Tabs

### 1. WRITE (Main Tab)
**Left Panel**: Thesis options
- Topic input
- Academic level (bachelor/master/phd)
- Language (en/de)
- Author metadata
- Advanced options

**Right Panel**: Live results
- Tabs: Preview | Outline | Sources | Chapters
- Real-time progress
- Milestone notifications
- Download buttons

### 2. CONTEXT (Research Materials)
- Upload existing papers
- Add custom sources
- Manage citations
- Import notes

### 3. LOG (History)
- View past theses
- Re-download files
- Copy topics
- Track usage

### 4. SETTINGS
- API preferences
- Notification settings
- Account info

## Tech Stack

- **Framework**: Next.js 14
- **UI**: Radix UI + Tailwind
- **State**: React Query + SWR
- **Auth**: Supabase Auth
- **Backend**: Modal (thesis-generator)
- **Storage**: Supabase Storage
- **Emails**: Resend

## Development

```bash
cd /Users/federicodeponte/opendraft-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - Other keys...

# Run locally
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

## Deployment

**Domain**: app.opendraft.xyz  
**Platform**: Vercel  
**Region**: Same as Modal (for low latency)

## Next Steps

1. Finish adapting ThesisWriter component
2. Create thesis API routes
3. Connect to Modal backend
4. Add real-time polling
5. Test locally
6. Deploy to app.opendraft.xyz
7. Add DNS record for app.opendraft.xyz

Let's build this! 🚀

