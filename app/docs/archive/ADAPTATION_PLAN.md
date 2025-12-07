# Adapting AEO Machine → OpenDraft Thesis Writer

## What We Copied
✅ Complete openaeomachine app structure
- UI components
- Layout patterns
- API route structure
- Hooks and utilities
- Styling and design system

## Adaptations Needed

### 1. Package.json Changes
```json
{
  "name": "opendraft-app",
  "description": "AI-powered thesis generation platform",
  "version": "1.0.0"
}
```

### 2. Rename Components
- `BlogGenerator.tsx` → `ThesisWriter.tsx`
- `blogs/` → `thesis/` or `write/`
- `keywords/` → keep or adapt for research topics

### 3. Update Pages
- `/blogs` → `/write` (main thesis writer)
- Keep `/context` (for uploading research materials)
- Keep `/settings` (for API keys)
- Keep `/log` (for thesis history)

### 4. API Routes
- `/api/generate-blog` → `/api/thesis/generate`
- Add `/api/thesis/[id]/status` (progress polling)
- Add `/api/thesis/[id]/content` (partial content)
- Connect to Modal backend instead of direct Gemini

### 5. Data Model Changes

**From (Blog)**:
```typescript
{
  keyword: string
  word_count: number
  tone: string
  content: string
}
```

**To (Thesis)**:
```typescript
{
  topic: string
  academic_level: 'bachelor' | 'master' | 'phd'
  language: 'en' | 'de'
  author_name?: string
  institution?: string
  current_phase: string
  progress_percent: number
  sources_count: number
  chapters_count: number
  pdf_url?: string
  docx_url?: string
}
```

### 6. UI Adaptations

**Left Panel** (Form):
- Topic input (instead of keyword)
- Academic level dropdown
- Language selector
- Author metadata fields
- Advanced options (citations, chapters)

**Right Panel** (Results):
- Tabbed interface:
  - Preview (live thesis content)
  - Outline (structure)
  - Sources (bibliography)
  - Chapters (individual sections)
- Progress with milestone streaming
- Download buttons (PDF, DOCX, ZIP)

### 7. Backend Integration

Connect to existing:
- Modal worker (`thesis-generator`)
- Supabase waitlist table
- Progress tracking fields
- Milestone streaming

## Implementation Steps

1. ✅ Copy openaeomachine → opendraft-app
2. Update package.json
3. Rename blog components → thesis components
4. Adapt form for thesis inputs
5. Create thesis API routes
6. Connect to Modal backend
7. Add progress polling
8. Add milestone streaming UI
9. Test locally
10. Deploy to app.opendraft.xyz

## Quick Start

This gives us a HUGE head start:
- ✅ Layout system
- ✅ UI components
- ✅ Form patterns
- ✅ Loading states
- ✅ Export functionality
- ✅ Log/history system
- ✅ Context management

We just need to adapt the content and connect to the thesis backend!

