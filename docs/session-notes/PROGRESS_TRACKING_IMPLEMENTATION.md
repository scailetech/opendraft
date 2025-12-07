# Progress Tracking Implementation Plan

## Current Status

✅ **Your thesis is complete and ready for download!**

## Problem Identified

You're right - we used to have detailed phase tracking (sources count, chapters, current phase) but it's currently **not being saved to the database**, only printed to logs.

## What's Missing

### Database Columns (Need to Add)
These columns don't exist in the `waitlist` table yet:
- `current_phase` - Current phase (research, writing, formatting, exporting, completed)
- `progress_percent` - Overall progress (0-100%)
- `sources_count` - Number of citations/sources found
- `chapters_count` - Number of chapters generated
- `progress_details` - JSON field for detailed phase info

### Integration Points
The thesis generator prints progress to logs but doesn't update the database:
```python
print("\n📚 PHASE 1: RESEARCH")  # Logged but not saved to DB
print(f"✅ Scout: {scout_result['count']} citations found")  # Not in DB
```

## Solution Created

### 1. SQL Migration (`backend/add_progress_tracking.sql`)
```sql
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sources_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS chapters_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_details JSONB DEFAULT '{}';
```

### 2. Progress Tracker Utility (`utils/progress_tracker.py`)
```python
tracker = ProgressTracker(user_id, supabase_client)

# During research
tracker.update_research(sources_count=35, phase_detail="Scout completed")

# During writing
tracker.update_writing(chapters_count=3, chapter_name="Introduction")

# During formatting
tracker.update_formatting()

# During export
tracker.update_exporting(export_type="PDF")

# On completion
tracker.mark_completed()
```

### 3. Integration in Modal Worker (`backend/modal_worker.py`)
- ✅ Added `supabase_client` parameter to `generate_thesis_real()`
- ✅ Created `ProgressTracker` instance at start
- ⏳ **TODO**: Pass tracker to `generate_thesis()` in `thesis_generator.py`
- ⏳ **TODO**: Add progress updates at each phase

## Implementation Steps

### Step 1: Run SQL Migration ✅ (Ready to Run)
Go to Supabase Dashboard → SQL Editor:
https://supabase.com/dashboard/project/rnuiiqgkytwmztgsanng/sql

Run:
```sql
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sources_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS chapters_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_details JSONB DEFAULT '{}';
```

### Step 2: Modify thesis_generator.py ⏳ (In Progress)
Add `tracker` parameter and update at key points:

```python
def generate_thesis(..., tracker=None):
    # PHASE 1: RESEARCH
    if tracker:
        tracker.update_phase("research", progress_percent=5)
    
    scout_result = research_citations_via_api(...)
    
    if tracker:
        tracker.update_research(sources_count=scout_result['count'])
    
    # PHASE 2: WRITING
    if tracker:
        tracker.update_writing(chapters_count=1, chapter_name="Introduction")
    
    # ... etc
```

### Step 3: Test Progress Tracking
Run a test thesis and monitor:
```bash
# Watch progress in real-time
cd website
npx tsx -e "..." # Query current_phase, progress_percent, sources_count
```

## Benefits After Implementation

### Real-Time Monitoring Dashboard
```
Current Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase: Writing (Chapter 3/7)
Progress: 45%
Sources: 35 citations
Chapters: 3 completed
Details: Currently writing "Methodology"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Better User Experience
- Show progress bar on frontend
- Display current phase to user
- Show estimated time remaining
- Give detailed status updates

### Better Debugging
- Know exactly where generation stopped if it fails
- See how many sources were found
- Track which chapter caused issues

## Next Actions

1. **You**: Run the SQL migration in Supabase Dashboard
2. **Me**: Complete integration in `thesis_generator.py`
3. **Test**: Run a test thesis to verify tracking works
4. **Deploy**: Push updates to Modal

Would you like me to:
1. Complete the integration in `thesis_generator.py` now?
2. Create a frontend component to display the progress?
3. Both?

