# Thesis Writer UI - Similar to AEO Machine Blogs Tab

## Design Pattern (From openaeomachine)

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│  Left Panel (384px)   │   Right Panel (flex-1)              │
│  ─────────────────────┼─────────────────────────────────   │
│  • Form inputs         │  • Live content display            │
│  • Settings            │  • Generated text                  │
│  • Options             │  • Editor/preview                  │
│  • Generate button     │  • Download options                │
└─────────────────────────────────────────────────────────────┘
```

## Implementation for Thesis Writer

### Left Panel - Thesis Options

```typescript
// File: website/app/(authenticated)/write/page.tsx
// Or: website/components/thesis/ThesisWriter.tsx

Features:
1. Topic Input
2. Academic Level (bachelor/master/phd)
3. Language (en/de)
4. Word Count Target
5. Chapter Selection/Customization
6. Academic Metadata (optional)
   - Author name
   - Institution
   - Advisor
7. Advanced Options (collapsible)
   - Custom instructions
   - Citation style
   - Custom chapters
8. Generate/Write Button

Progress Display:
- Phase indicator
- Progress bar
- Sources count
- Chapters completed
- Time elapsed/remaining
```

### Right Panel - Live Thesis Display

```typescript
Features:
1. Empty State
   - "Enter topic and click Write to start"
   - Icon placeholder

2. Generating State
   - Animated icon
   - Rotating messages
     • "🔍 Researching your topic"
     • "📚 Gathering 35 academic sources"
     • "📝 Writing Introduction" 
     • "✍️ Composing Chapter 2"
     • "🎯 Formatting citations"
   - Progress bar
   - Phase indicator
   - "Feel free to navigate away - results in Dashboard"

3. Results State
   - Tabbed interface:
     ├─ Preview (rendered thesis)
     ├─ Outline (table of contents)
     ├─ Sources (bibliography)
     └─ Chapters (individual chapters)
   
   - Header:
     • Title
     • Word count, sources, time
     • Export buttons (PDF, DOCX, ZIP)
   
   - Content:
     • Live rendered thesis (markdown/HTML)
     • Editable sections
     • Chapter navigation
     • Citation tooltips

4. Real-time Updates
   - Stream partial content as it's generated
   - Show chapters as they complete
   - Update outline as structure emerges
   - Display sources as they're found
```

## UI Components Needed

### Create these files:

1. **`website/app/(authenticated)/write/page.tsx`**
   - Main page wrapper
   - Lazy load ThesisWriter component

2. **`website/components/thesis/ThesisWriter.tsx`**
   - Main two-panel layout
   - Form state management
   - API integration

3. **`website/components/thesis/ThesisForm.tsx`**
   - Left panel form
   - All input controls
   - Generate button

4. **`website/components/thesis/ThesisPreview.tsx`**
   - Right panel content
   - Tabbed interface
   - Live preview rendering

5. **`website/components/thesis/ThesisProgress.tsx`**
   - Progress indicator component
   - Phase tracking
   - Animated loading states

6. **`website/app/api/thesis/generate/route.ts`**
   - API endpoint to trigger generation
   - Connects to Modal backend
   - Returns job ID for polling

7. **`website/app/api/thesis/[thesisId]/status/route.ts`**
   - Poll for progress updates
   - Returns phase, progress %, sources, chapters

8. **`website/app/api/thesis/[thesisId]/content/route.ts`**
   - Fetch generated content
   - Returns chapters, outline, sources

## Key Features to Implement

### 1. Real-Time Progress (from our tracking)
```typescript
interface ThesisProgress {
  status: 'waiting' | 'processing' | 'completed' | 'failed'
  current_phase: 'research' | 'structure' | 'writing' | 'compiling' | 'exporting'
  progress_percent: number // 0-100
  sources_count: number
  chapters_count: number
  progress_details: {
    stage: string
    current_chapter?: string
    milestone?: string
  }
}
```

### 2. Milestone Streaming (show partial results)
```typescript
When research completes:
  - Show "35 sources found!" notification
  - Display bibliography in Sources tab
  - Enable download of bibliography

When outline completes:
  - Show outline in Outline tab
  - Display chapter structure
  - Enable download of outline

When each chapter completes:
  - Add to Chapters tab
  - Show in preview
  - Enable individual chapter download
```

### 3. Progressive Enhancement
```typescript
// Start with basic: Generate entire thesis
// Enhance: Stream partial results
// Future: Allow editing during generation
// Future: Regenerate specific chapters
// Future: Add/remove sources
// Future: Adjust outline and continue
```

## Visual Design (Match AEO Machine Style)

### Colors & Styling
- Left panel: `border-r border-border p-6`
- Right panel: `flex-1 flex flex-col overflow-hidden p-6`
- Form sections: `space-y-6`
- Progress bar: `bg-gradient-to-r from-purple-500 to-blue-500`
- Info boxes: 
  - Warning: `bg-yellow-500/10 border border-yellow-500/20`
  - Success: `bg-green-500/10 border border-green-500/20`
  - Info: `bg-blue-500/10 border border-blue-500/20`

### Loading Messages (Rotating)
```typescript
const THESIS_LOADING_MESSAGES = [
  '🔍 Researching your topic',
  '📚 Gathering academic sources',
  '📖 Reading research papers',
  '✍️ Writing introduction',
  '🎯 Composing main chapters',
  '📝 Formatting citations',
  '✨ Finalizing your thesis',
]
```

### Interactive Elements
- Collapsible "Advanced Options" section
- Popover for tone/style examples
- Tabs for different views (Preview, Outline, Sources, Chapters)
- Download buttons for each format
- "Feel free to navigate away" message during generation

## Data Flow

```
User fills form → Click "Generate Thesis"
   ↓
Create waitlist entry (Supabase)
   ↓
Trigger Modal function (API call)
   ↓
Show loading state
   ↓
Poll for updates every 5 seconds
   ↓
Display progress (phase, %, sources, chapters)
   ↓
Show milestone notifications (Research complete!, etc.)
   ↓
Display partial results in tabs
   ↓
Final completion → Show full thesis
   ↓
Enable download (PDF, DOCX, ZIP)
```

## Next Steps to Build This

1. Create the page structure
2. Build the form component
3. Build the preview component
4. Add API routes
5. Integrate with existing backend
6. Add real-time polling
7. Add milestone streaming
8. Polish UI/UX

Would you like me to start building this UI now?

