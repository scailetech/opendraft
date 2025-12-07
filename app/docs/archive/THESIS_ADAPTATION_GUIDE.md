# OpenDraft App - Thesis Writer UI

## Base: Copied from openaeomachine (AEO Machine)

This app is based on the AEO Machine blog generator UI, adapted for thesis writing.

## Key Adaptations

### 1. Main Tab: Blogs → Write (Thesis Writer)

**File Changes:**
- `app/(authenticated)/blogs/page.tsx` → `app/(authenticated)/write/page.tsx`
- `components/blogs/BlogGenerator.tsx` → `components/thesis/ThesisWriter.tsx`

**UI Adaptations:**
- Left Panel: Blog form → Thesis form
  - Keyword → Topic
  - Word count → Keep (thesis length)
  - Tone → Academic level (bachelor/master/phd)
  - Add: Language (en/de)
  - Add: Author metadata (name, institution, advisor)
  
- Right Panel: Blog content → Thesis display
  - Add tabs: Preview | Outline | Sources | Chapters
  - Show real-time progress
  - Stream partial results (research, outline, chapters)
  - Download buttons (PDF, DOCX, ZIP)

### 2. Context Tab → Keep (Upload Research Materials)

Can be used to upload:
- Existing research papers
- Notes
- Custom sources
- Company context (for business theses)

### 3. Keywords Tab → Research Topics (Optional)

Could adapt for:
- Predefined thesis topic templates
- Topic suggestions
- Research area exploration

### 4. Log Tab → Keep (Thesis History)

Shows:
- Previously generated theses
- Access past work
- Download again

### 5. Settings Tab → Keep

- Gemini API key (optional - we use server-side)
- Notification preferences
- Export preferences

## Backend Connection

### API Routes to Create/Adapt

1. **`/api/thesis/generate`** (from `/api/generate-blog`)
   ```typescript
   POST /api/thesis/generate
   Body: {
     topic: string
     academic_level: 'bachelor' | 'master' | 'phd'
     language: 'en' | 'de'
     author_name?: string
     institution?: string
     // ... other metadata
   }
   Response: {
     thesis_id: string
     status: 'queued' | 'processing'
   }
   ```

2. **`/api/thesis/[id]/status`** (NEW)
   ```typescript
   GET /api/thesis/[id]/status
   Response: {
     status: 'processing' | 'completed' | 'failed'
     current_phase: string
     progress_percent: number
     sources_count: number
     chapters_count: number
     progress_details: object
   }
   ```

3. **`/api/thesis/[id]/content`** (NEW)
   ```typescript
   GET /api/thesis/[id]/content
   Response: {
     outline?: string
     chapters: Array<{name: string, content: string}>
     sources: Array<Citation>
     pdf_url?: string
     docx_url?: string
     zip_url?: string
   }
   ```

### Connect to Modal

Instead of calling Gemini directly (like blogs do), we:
1. Insert into Supabase `waitlist` table
2. Trigger Modal `daily_thesis_batch` or `process_single_user`
3. Poll for progress via Supabase
4. Display results when complete

## File Mapping

### Keep As-Is
- `components/ui/*` - All UI components
- `lib/*` - Utilities
- `hooks/*` - Custom hooks
- `app/auth/*` - Authentication
- `middleware.ts` - Auth middleware
- `contexts/*` - React contexts

### Adapt
- `app/(authenticated)/blogs/` → `write/`
- `components/blogs/` → `thesis/`
- `app/api/generate-blog/` → `api/thesis/generate/`
- `app/api/batch/` → (can keep for batch thesis generation)

### Maybe Remove
- `modal-processor/` (we use separate backend repo)
- `services/website_analyzer.py` (not needed for thesis)
- Render-specific files (we deploy to Vercel)

## Next Steps

1. Rename /blogs → /write
2. Copy BlogGenerator → ThesisWriter
3. Adapt form inputs
4. Create thesis API routes
5. Connect to Modal backend
6. Test locally
7. Deploy to app.opendraft.xyz

Ready to start?

