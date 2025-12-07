# OpenDraft App - Setup Instructions

## ✅ What's Been Built

### Components
- ✅ `ThesisWriter.tsx` - Clean two-panel UI for thesis generation
- ✅ `ThesisWriter-v2.tsx` - Same clean version
- ✅ `ThesisWriter-old.tsx` - Original adapted from BlogGenerator (backup)

### API Routes
- ✅ `/api/thesis/generate` - Start thesis generation
- ✅ `/api/thesis/[id]/status` - Poll for progress
- ✅ `/api/thesis/[id]/content` - Fetch content/milestones

### Navigation
- ✅ WRITE (main thesis writer)
- ✅ CONTEXT (research materials)
- ✅ LOG (thesis history)
- ✅ SETTINGS (preferences)

## 🚀 Local Setup

### 1. Create .env.local

Create `/Users/federicodeponte/opendraft-app/.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://rnuiiqgkytwmztgsanng.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJudWlpcWdreXR3bXp0Z3Nhbm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NDA4MzAsImV4cCI6MjA0ODExNjgzMH0.C3gRqoiNl5TRvEhR1eJGCLdOmLCahOExw7V0HwBUMsw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJudWlpcWdreXR3bXp0Z3Nhbm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjU0MDgzMCwiZXhwIjoyMDQ4MTE2ODMwfQ.hJ1SdRW1s8MnKPR9EULz8vJLJZ_dCWufNHKaH2sH-GY

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=OpenDraft
```

### 2. Install Dependencies

```bash
cd /Users/federicodeponte/opendraft-app
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Should open at: http://localhost:3000

### 4. Test the Flow

1. Navigate to http://localhost:3000/write
2. Enter a thesis topic
3. Select academic level
4. Click "Generate Thesis"
5. Watch real-time progress
6. Download PDF/DOCX when complete

## 📊 How It Works

### Frontend Flow
```
ThesisWriter Component
   ↓
User fills form + clicks Generate
   ↓
POST /api/thesis/generate
   ↓
Creates/updates waitlist entry in Supabase
   ↓
Returns thesis_id
   ↓
Starts polling GET /api/thesis/{id}/status every 5s
   ↓
Updates UI with progress (phase, %, sources, chapters)
   ↓
Shows "Completed" with download buttons
```

### Backend Connection
```
Supabase waitlist table
   ↓ monitored by
Modal daily_thesis_batch (or triggered manually)
   ↓ updates
Progress fields (current_phase, progress_percent, etc.)
   ↓ polled by
Frontend API routes
   ↓ displayed in
ThesisWriter UI
```

## 🎯 Features Implemented

### Left Panel (Form)
- ✅ Topic textarea
- ✅ Academic level selector (Bachelor's/Master's/PhD)
- ✅ Language selector (English/German)
- ✅ Optional metadata (author, institution, advisor)
- ✅ Collapsible advanced options
- ✅ Generate button with loading state

### Right Panel (Results)
- ✅ Empty state with icons
- ✅ Loading state with:
  - Animated graduation cap icon
  - Rotating messages
  - Progress bar
  - Phase indicator
  - Sources/chapters count
  - "Navigate away" message
- ✅ Completed state with:
  - Tabbed interface (Preview/Outline/Sources/Chapters)
  - Download buttons (PDF/DOCX/ZIP)
  - Thesis metadata

## 🔧 Next Steps

1. Test locally
2. Fix any TypeScript errors
3. Add authentication check
4. Improve error handling
5. Add milestone notifications in UI
6. Deploy to Vercel
7. Configure app.opendraft.xyz DNS

## 📱 Mobile Responsiveness

The two-panel layout needs responsive breakpoints:
- Desktop: Side-by-side panels
- Mobile: Stacked (form on top, results below)

TODO: Add responsive classes

## 🎨 Styling

Uses existing theme from AEO Machine:
- Tailwind CSS
- shadcn/ui components
- Dark mode support
- Gradient accents

Ready to test!

