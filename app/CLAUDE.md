# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**bulk.run** is an AI-powered bulk content generation platform that processes CSV data at scale using Google Gemini AI. The application is built as a Next.js 14 SaaS with Supabase backend and Modal.com for serverless batch processing.

### Core Capabilities
- CSV batch processing through Gemini AI with template variable replacement
- Real-time streaming results and progress tracking
- Context file management for enhanced AI outputs
- Saved prompts library and scheduling system
- Analytics dashboard with usage tracking
- Resource management system (leads, keywords, content, campaigns)
- Agency package management for client assignments

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI
- **State Management**: React Hooks + SWR for client-side caching
- **Backend**: Supabase (PostgreSQL), Row Level Security (RLS)
- **AI Processing**: Google Gemini 2.5 Flash via Modal.com serverless functions
- **Deployment**: Vercel (frontend), Modal.com (batch processor)
- **Testing**: Vitest (unit), Playwright (E2E)

## Development Commands

```bash
# Development
npm run dev                 # Start dev server (http://localhost:3000)
npm run type-check          # TypeScript type checking
npm run lint                # ESLint linting
npm run build               # Production build
npm start                   # Start production server
npm run analyze             # Analyze bundle size

# Testing
npm test                    # Run Vitest unit tests
npm run test:ui             # Vitest UI
npm run test:coverage       # Coverage report
npm run test:e2e            # Playwright E2E tests
npm run test:setup          # Setup E2E test environment
npm run test:cleanup        # Clean up test processes

# Database
supabase db push            # Apply migrations to Supabase
```

## Architecture Overview

### Request Flow

1. **User uploads CSV** → Next.js API (`/api/process/route.ts`)
2. **Creates batch record** → Supabase `batches` table with `status: 'pending'`
3. **Modal poller detects** → `poll_pending_batches()` runs every 10 seconds
4. **Parallel processing** → Each row processed independently via `process_row.starmap()`
5. **Results stored** → `batch_results` table with token tracking
6. **Resources created** → Automatic resource creation from successful batch results
7. **Status updates** → Real-time via Supabase subscriptions

### Key Design Patterns

**Fire-and-Forget Processing**
- Batch creation returns immediately to avoid Vercel timeouts
- Modal polls database every 10s for `status='pending'` batches
- This works around Vercel → Modal network blocking

**Parallel Row Processing**
- Each CSV row processed in separate Modal container via `.starmap()`
- 24-hour timeout per batch, 1-hour timeout per row
- Automatic retry with exponential backoff on transient failures

**SWR Caching Strategy**
- Client-side data fetching with automatic revalidation
- Cache headers on API routes: `private, max-age=30, stale-while-revalidate=60`
- Expected 70-80% cache hit rate for typical usage

**Performance Logging**
- All API routes log timing: `[PERF] Operation: {total: "245ms", query: "180ms"}`
- Web Vitals automatically tracked (LCP, FID, CLS, FCP, TTFB)

## Directory Structure

```
app/
├── (authenticated)/        # Protected routes requiring auth
│   ├── home/              # Main dashboard/bulk processor
│   ├── context/           # Context files + business context management
│   ├── analytics/         # Usage analytics and results
│   ├── profile/           # User profile and settings
│   ├── schedules/         # Scheduled batch runs
│   ├── billing/           # Usage tracking and invoices
│   └── run/[id]/          # Individual batch run details
├── api/                   # Next.js API routes
│   ├── process/           # Batch creation endpoint
│   ├── batch/             # Batch status and results
│   ├── agents/            # Agent definitions and stats
│   ├── business-context/  # Business context CRUD
│   ├── context-files/     # Context file upload/download
│   └── export/            # CSV export with streaming
└── auth/                  # Supabase authentication callbacks

components/
├── bulk/                  # Bulk processor UI (CSV upload, prompt editor)
├── dashboard/             # Dashboard widgets and analytics
├── context/               # Context file management UI
├── ui/                    # Shared Radix UI components
└── schedules/             # Scheduling interface

lib/
├── supabase/             # Supabase client factories
│   ├── client.ts         # Browser client
│   ├── server.ts         # Server client with cookies
│   └── admin.ts          # Service role client
├── utils/
│   ├── batch-to-resources.ts  # Automatic resource creation logic
│   └── csv-parser.ts     # CSV parsing with validation
├── analytics/            # Web Vitals monitoring
└── types/                # TypeScript type definitions

modal-processor/
└── main.py               # Modal.com batch processor (Python)

supabase/migrations/      # Database schema migrations
```

## Database Schema (Key Tables)

**batches** - Batch job records
- `id`, `user_id`, `status`, `data` (CSV rows as JSON), `prompt`, `context`, `output_schema`
- `agent_id` links to `agent_definitions` for resource creation
- `status`: 'pending' → 'processing' → 'completed' | 'completed_with_errors' | 'failed'

**batch_results** - Individual row results
- `id`, `batch_id`, `input_data`, `output_data`, `row_index`, `status`
- `input_tokens`, `output_tokens`, `model` for usage tracking

**resources** - Unified resource storage (GTM Engine)
- `type`: 'lead' | 'keyword' | 'content' | 'campaign'
- `data` (JSONB), `source_type`, `source_name`, `batch_id`
- Automatically created from batch results via `batch-to-resources.ts`

**agent_definitions** - Database-driven agent configurations
- Predefined agents: `bulk-agent`, `lead-crawling-agent`, `aeo-domination-agent`, etc.
- Linked to batches for automatic resource creation

**context_files** - User-uploaded reference files
- Stored in Supabase Storage bucket `context-files/`
- Used to enhance AI context during processing

**saved_prompts** - Reusable prompt templates
- User can save/load prompts with variables

**business_contexts** - User business profiles
- ICP, target countries, products, keywords for personalized AI outputs

## Important Implementation Details

### Batch Processing Flow

1. **Create Batch** (`app/api/process/route.ts`)
   - Validates CSV structure and prompt
   - Creates batch record with `status: 'pending'`
   - Returns immediately (no waiting for processing)

2. **Modal Poller** (`modal-processor/main.py::poll_pending_batches`)
   - Scheduled function runs every 10 seconds
   - Queries for oldest `status='pending'` batch
   - Marks as `processing` and spawns parallel row processing

3. **Process Rows** (`modal-processor/main.py::process_row`)
   - Replaces `{{variable}}` placeholders with CSV column values
   - Calls Gemini API with retry logic (3 attempts, exponential backoff)
   - Enforces JSON schema if `output_schema` provided
   - Stores result in `batch_results` with token counts

4. **Create Resources** (`lib/utils/batch-to-resources.ts`)
   - Triggered when batch completes
   - Maps agent_id to resource type
   - Extracts relevant fields from `output_data`
   - Creates resources in `resources` table

### Template Variable Replacement

Prompts support `{{column_name}}` syntax:
```
Analyze {{company_name}} and rate innovation on {{metric}}
```

With CSV row: `{company_name: "Tesla", metric: "technology"}`
Becomes: `Analyze Tesla and rate innovation on technology`

### Output Schema Enforcement

When `output_schema` is provided, Gemini API enforces exact JSON structure:
```typescript
output_schema: [
  {name: "innovation_score", description: "1-10 rating"},
  {name: "reasoning", description: "Why this score"}
]
```

Gemini returns: `{"innovation_score": "8", "reasoning": "..."}`

### Resource Creation Mapping

Agent ID → Resource Type:
- `bulk-agent` → `content`
- `lead-crawling-agent` → `lead`
- `aeo-domination-agent` → `content`
- `outbound-campaign-agent` → `campaign`
- `market-analytics-agent` → `keyword`

Only batches with `agent_id` create resources.

### Authentication & Authorization

- Supabase Auth with Row Level Security (RLS)
- All tables filtered by `user_id` automatically
- Server-side: Use `lib/supabase/server.ts` (reads cookies)
- Client-side: Use `lib/supabase/client.ts`
- Admin operations: Use `lib/supabase/admin.ts` (service role key)

## Common Development Tasks

### Adding a New API Route

```typescript
// app/api/example/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('user_id', user.id)

  const totalTime = Date.now() - startTime
  console.log(`[PERF] Example fetch: ${totalTime}ms`)

  return NextResponse.json({ data }, {
    headers: {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
    },
  })
}
```

### Using SWR for Data Fetching

```typescript
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useExample() {
  const { data, error, isLoading, mutate } = useSWR('/api/example', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 60000, // 60 seconds
  })

  return { data, error, isLoading, refresh: mutate }
}
```

### Adding Database Migration

```sql
-- supabase/migrations/YYYYMMDD_description.sql
-- Add new table
CREATE TABLE example_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own records"
  ON example_table FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON example_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_example_user_id ON example_table(user_id);
CREATE INDEX idx_example_created_at ON example_table(created_at DESC);
```

### Modal Deployment

```bash
# Deploy Modal processor
cd modal-processor
modal deploy main.py --env-file ../.env.local

# Monitor logs
modal logs bulk-gpt-processor-mvp --follow

# Check health
curl https://scaile--bulk-gpt-processor-mvp-health-check.modal.run
```

## Testing Strategy

### E2E Testing Setup

```bash
# One-time setup
npm run test:setup

# Run tests
npm run test:e2e

# Cleanup
npm run test:cleanup
```

Test files: `e2e/*.spec.ts`, `playwright-tests/*.spec.ts`
Auth state: `playwright/.auth/user.json`

### Writing Tests

```typescript
// e2e/example.spec.ts
import { test, expect } from '@playwright/test'

test('should process batch', async ({ page }) => {
  await page.goto('/home')

  // Upload CSV
  await page.locator('input[type="file"]').setInputFiles('test-data/sample.csv')

  // Enter prompt
  await page.fill('textarea[name="prompt"]', 'Analyze {{company}}')

  // Submit
  await page.click('button:has-text("Process")')

  // Wait for completion
  await expect(page.locator('.status-completed')).toBeVisible({ timeout: 30000 })
})
```

## Performance Optimization

### Bundle Splitting

Heavy components are lazy-loaded:
```typescript
const AnalyticsDashboard = dynamic(
  () => import('@/components/dashboard/AnalyticsDashboard'),
  { ssr: false, loading: () => <Skeleton /> }
)
```

### SWR Configuration

Global config in `app/providers.tsx`:
```typescript
<SWRConfig value={{
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 60000,
  errorRetryCount: 3,
}}>
```

### Database Query Optimization

Always add indexes for filtered columns:
```sql
CREATE INDEX idx_batches_user_status ON batches(user_id, status);
CREATE INDEX idx_batch_results_batch_status ON batch_results(batch_id, status);
```

## Security Considerations

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- Always validate user ownership via RLS or `user_id` checks
- Sanitize CSV input to prevent injection attacks
- Rate limit API endpoints for abuse prevention
- Use Supabase Storage security policies for file uploads

## Environment Variables

Required for development (`.env.local`):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# AI Processing (for Modal)
GEMINI_API_KEY=AIzaSyxxx

# Optional
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Troubleshooting

### Batch Stuck in "pending"
- Check Modal poller is running: `modal logs bulk-gpt-processor-mvp --follow`
- Verify Modal secret exists: `modal secret list`
- Check Supabase credentials in Modal secret

### Resources Not Created
- Verify batch has `agent_id` set
- Check `batch-to-resources.ts` mapping includes agent
- Look for `[RESOURCES]` logs in development mode

### SWR Cache Issues
- Use `mutate()` to refresh specific cache key
- Global refresh: `useSWRConfig().mutate()`
- Clear all caches on logout

### Type Errors
- Run `npm run type-check` to see all errors
- Check `lib/types/` for shared type definitions
- Ensure Supabase types are up-to-date

## Code Quality Standards

- Use TypeScript strict mode (enabled in `tsconfig.json`)
- All components must have proper TypeScript interfaces for props
- Add performance logging to new API routes
- Use existing component patterns from `components/ui/`
- Follow Tailwind design tokens from `lib/design-tokens.ts`
- Add comments for complex business logic
- Keep functions focused and single-purpose
- please, if it can help me to not get this errors please make it happen