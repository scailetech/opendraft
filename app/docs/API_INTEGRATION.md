# bulk.run API Integration Guide

Complete guide for integrating with the bulk.run processing API using curl, TypeScript, or external tools (n8n, Zapier, etc.).

## Table of Contents

- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [TypeScript Client](#typescript-client)
- [Shell Script Testing](#shell-script-testing)
- [External Integrations](#external-integrations)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)

---

## Quick Start

### 1. Get an API Key

```bash
# Via UI: Dashboard → API Keys → Create New Key
# Or via API (requires session):
curl -X POST https://bulk-gpt-app.vercel.app/api/keys \
  -H "Cookie: supabase-auth-token=<your_session>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Integration Key"}'
```

### 2. Create a Batch

```bash
curl -X POST https://bulk-gpt-app.vercel.app/api/process \
  -H "Authorization: Bearer bgpt_<YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "csvFilename": "customers.csv",
    "rows": [
      {"name": "Alice", "company": "Stripe"},
      {"name": "Bob", "company": "Anthropic"}
    ],
    "prompt": "Write a bio for {{name}} at {{company}}",
    "outputColumns": ["bio"]
  }'
```

**Response:**
```json
{
  "success": true,
  "batchId": "batch_1730397600000_abc123",
  "status": "pending",
  "totalRows": 2,
  "message": "Batch created. Processing started asynchronously."
}
```

### 3. Check Status

```bash
curl -H "Authorization: Bearer bgpt_<YOUR_API_KEY>" \
  https://bulk-gpt-app.vercel.app/api/batch/batch_1730397600000_abc123/status
```

---

## Authentication

The API supports **3 authentication methods**:

### Method 1: API Key (Recommended)

```bash
Authorization: Bearer bgpt_<YOUR_32_CHAR_KEY>
```

- Generate via UI or API
- Format: `bgpt_` + 32 URL-safe characters
- Stored as SHA-256 hash in database

### Method 2: Supabase Session Token

```bash
Authorization: Bearer <supabase_jwt_token>
```

- Obtained from Supabase auth session
- Short-lived JWT

### Method 3: Cookie-based Session

- Automatic for browser requests
- Uses Supabase authentication cookies

---

## API Endpoints

### POST /api/process

Create a new batch and start asynchronous processing.

**Request:**
```typescript
{
  csvFilename: string         // Original CSV filename
  rows: Array<Record<string, any>>  // Array of row objects
  prompt: string              // Template with {{column}} placeholders
  context?: string            // Optional additional context
  outputColumns?: string[]    // Output field names (default: ["bio"])
  webhookUrl?: string         // HTTPS webhook for completion notification
}
```

**Response (202 Accepted):**
```typescript
{
  success: boolean
  batchId: string
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  totalRows: number
  message: string
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/process \
  -H "Authorization: Bearer bgpt_abc123..." \
  -H "Content-Type: application/json" \
  -d @request.json
```

**request.json:**
```json
{
  "csvFilename": "leads.csv",
  "rows": [
    {"name": "John Doe", "company": "Acme Inc", "role": "CEO"},
    {"name": "Jane Smith", "company": "Tech Corp", "role": "CTO"}
  ],
  "prompt": "Research {{name}} at {{company}} ({{role}}). Return JSON with: company_name, industry, business_model",
  "outputColumns": ["company_name", "industry", "business_model"],
  "webhookUrl": "https://hooks.n8n.cloud/webhook/your-webhook-id"
}
```

---

### GET /api/batch/[batchId]/status

Get current batch status and all results.

**Response:**
```typescript
{
  success: boolean
  batchId: string
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  totalRows: number
  processedRows: number
  progressPercent: number
  results: Array<{
    id: string
    input: Record<string, any>
    output: string | null
    status: 'pending' | 'processing' | 'success' | 'error'
    error: string | null
  }>
  message: string
  createdAt: string
  updatedAt: string
}
```

**Example:**
```bash
curl -H "Authorization: Bearer bgpt_abc123..." \
  http://localhost:3000/api/batch/batch_1730397600000_abc123/status
```

---

### GET /api/batch/[batchId]/stream

Server-Sent Events (SSE) stream for real-time progress updates.

**Event Types:**
- `progress` - Overall batch progress
- `result` - Individual row completion
- `complete` - Batch finished
- `error` - Stream error

**Example:**
```bash
curl -N -H "Authorization: Bearer bgpt_abc123..." \
  http://localhost:3000/api/batch/batch_1730397600000_abc123/stream
```

**Stream Output:**
```
event: progress
data: {"total":2,"completed":0,"status":"processing"}

event: result
data: {"id":"batch_123-0","row_index":0,"status":"success","output_data":"John Doe is CEO..."}

event: progress
data: {"total":2,"completed":1,"status":"processing"}

event: result
data: {"id":"batch_123-1","row_index":1,"status":"success","output_data":"Jane Smith is CTO..."}

event: complete
data: {"status":"completed","total":2,"processed":2}
```

---

## TypeScript Client

### Installation

The TypeScript client is located at `lib/api/batch-client.ts`.

### Usage

```typescript
import { BatchAPIClient, createBatchClient } from '@/lib/api/batch-client'

// Create client
const client = createBatchClient('https://bulk-gpt-app.vercel.app', 'bgpt_your_api_key')

// Create batch
const batch = await client.createBatch({
  csvFilename: 'customers.csv',
  rows: [
    { name: 'Alice', company: 'Stripe' },
    { name: 'Bob', company: 'Anthropic' }
  ],
  prompt: 'Write a professional bio for {{name}} at {{company}}',
  outputColumns: ['bio']
})

console.log('Batch created:', batch.batchId)

// Poll until complete
const result = await client.pollBatchUntilComplete(
  batch.batchId,
  2000, // poll every 2s
  60,   // max 60 attempts
  (status) => {
    console.log(`Progress: ${status.progressPercent}%`)
  }
)

console.log('Results:', result.results)
```

### Streaming with TypeScript

```typescript
// Stream results with event handlers
const eventSource = client.streamBatchResults(batch.batchId, {
  onProgress: (event) => {
    console.log(`Progress: ${event.completed}/${event.total}`)
  },
  onResult: (event) => {
    console.log(`Row ${event.row_index}: ${event.status}`)
    if (event.status === 'success') {
      console.log('Output:', event.output_data)
    }
  },
  onComplete: (event) => {
    console.log(`Batch ${event.status}: ${event.processed}/${event.total} processed`)
    eventSource.close()
  },
  onError: (error) => {
    console.error('Stream error:', error)
  }
})
```

---

## Shell Script Testing

Use the provided test script for manual API testing:

```bash
# Run all tests
./scripts/test-bulk-api.sh

# Run specific test
./scripts/test-bulk-api.sh create    # Test POST /api/process
./scripts/test-bulk-api.sh status    # Test GET /api/batch/[id]/status
./scripts/test-bulk-api.sh stream    # Test SSE streaming
./scripts/test-bulk-api.sh errors    # Test error handling
```

### Environment Variables

```bash
# Optional: Set API key
export BULK_GPT_API_KEY="bgpt_your_key_here"

# Optional: Change base URL
export BASE_URL="https://bulk-gpt-app.vercel.app"

./scripts/test-bulk-api.sh
```

---

## External Integrations

### n8n Workflow

```json
{
  "nodes": [
    {
      "parameters": {
        "url": "https://bulk-gpt-app.vercel.app/api/process",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "options": {},
        "bodyParametersJson": "={{ JSON.stringify({\n  csvFilename: 'n8n-batch.csv',\n  rows: $json.rows,\n  prompt: $json.prompt,\n  outputColumns: ['result'],\n  webhookUrl: 'https://your-n8n-instance/webhook/batch-complete'\n}) }}"
      },
      "name": "Create Batch",
      "type": "n8n-nodes-base.httpRequest",
      "credentials": {
        "httpHeaderAuth": {
          "id": "1",
          "name": "bulk.run API Key"
        }
      }
    },
    {
      "parameters": {
        "url": "=https://bulk-gpt-app.vercel.app/api/batch/{{ $json.batchId }}/status",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth"
      },
      "name": "Poll Status",
      "type": "n8n-nodes-base.httpRequest"
    }
  ]
}
```

### Zapier Integration

1. **Trigger**: Webhook (when you have new data)
2. **Action**: Code by Zapier (Python)

```python
import requests
import time

# Create batch
response = requests.post(
    'https://bulk-gpt-app.vercel.app/api/process',
    headers={
        'Authorization': 'Bearer bgpt_your_key',
        'Content-Type': 'application/json'
    },
    json={
        'csvFilename': 'zapier-batch.csv',
        'rows': input_data['rows'],
        'prompt': input_data['prompt'],
        'outputColumns': ['result']
    }
)

batch = response.json()
batch_id = batch['batchId']

# Poll until complete
while True:
    status_response = requests.get(
        f'https://bulk-gpt-app.vercel.app/api/batch/{batch_id}/status',
        headers={'Authorization': 'Bearer bgpt_your_key'}
    )
    status = status_response.json()

    if status['status'] in ['completed', 'completed_with_errors', 'failed']:
        break

    time.sleep(2)

return {'results': status['results']}
```

### Make.com (Integromat)

1. **HTTP Module** → POST `/api/process`
2. **Repeater** → Poll `/api/batch/[id]/status` every 2s
3. **Router** → Handle completed/failed states

---

## Error Handling

### Common Errors

**401 Unauthorized:**
```json
{
  "error": "Unauthorized - please sign in or provide valid Bearer token/API key"
}
```
**Fix:** Add `Authorization: Bearer <api_key>` header

**400 Bad Request:**
```json
{
  "error": "csvFilename is required and must be a string"
}
```
**Fix:** Ensure all required fields are present and valid

**429 Rate Limit:**
```json
{
  "error": "You have 1 batch processing. Please wait for completion.",
  "limit": 1,
  "current": 1
}
```
**Fix:** Wait for current batch to finish

**500 Internal Server Error:**
```json
{
  "error": "Failed to create batch in database"
}
```
**Fix:** Retry after a few seconds; check server status

### Retry Logic

```typescript
async function createBatchWithRetry(client: BatchAPIClient, request: CreateBatchRequest, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.createBatch(request)
    } catch (error) {
      if (attempt === maxRetries) throw error

      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000
      console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

---

## Rate Limits

### Beta Plan (Current)

- **Daily batches**: 5 per day
- **Rows per batch**: 1,000 max
- **Daily rows**: 5,000 total
- **Concurrent batches**: 1

### Checking Limits

Rate limit information is returned in error responses:

```json
{
  "error": "Daily batch limit (5) exceeded",
  "limit": 5,
  "current": 5,
  "beta": true
}
```

### Best Practices

1. **Monitor rate limits** - Track your daily usage
2. **Implement backoff** - Retry with exponential delay on 429 errors
3. **Batch efficiently** - Combine multiple rows into single batches
4. **Use webhooks** - Avoid constant polling; use webhook notifications

---

## Examples

### Example 1: Simple Batch Processing

```bash
#!/bin/bash

# Create batch
BATCH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/process \
  -H "Authorization: Bearer bgpt_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "csvFilename": "test.csv",
    "rows": [{"name": "Alice", "company": "Stripe"}],
    "prompt": "Write bio for {{name}} at {{company}}"
  }')

BATCH_ID=$(echo $BATCH_RESPONSE | jq -r '.batchId')
echo "Batch created: $BATCH_ID"

# Poll status
while true; do
  STATUS_RESPONSE=$(curl -s -H "Authorization: Bearer bgpt_abc123..." \
    "http://localhost:3000/api/batch/$BATCH_ID/status")

  STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
  echo "Status: $STATUS"

  if [[ "$STATUS" == "completed" || "$STATUS" == "failed" ]]; then
    break
  fi

  sleep 2
done

# Output results
echo $STATUS_RESPONSE | jq '.results'
```

### Example 2: TypeScript with Next.js API Route

```typescript
// pages/api/process-leads.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { createBatchClient } from '@/lib/api/batch-client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const client = createBatchClient('', process.env.BULK_GPT_API_KEY)

  try {
    // Create batch
    const batch = await client.createBatch({
      csvFilename: 'leads.csv',
      rows: req.body.leads,
      prompt: 'Research {{name}} at {{company}}. Return JSON with: company_name, industry',
      outputColumns: ['company_name', 'industry']
    })

    // Poll until complete (in production, use webhooks instead)
    const result = await client.pollBatchUntilComplete(batch.batchId)

    return res.status(200).json({
      success: true,
      results: result.results
    })
  } catch (error) {
    console.error('Batch processing error:', error)
    return res.status(500).json({ error: 'Batch processing failed' })
  }
}
```

---

## Testing

### Playwright Tests

Run the provided Playwright test suite:

```bash
# Full API integration test
npx playwright test playwright-tests/api-bulk-processing.spec.ts

# Specific test
npx playwright test playwright-tests/api-bulk-processing.spec.ts --grep="Full API workflow"
```

### Manual cURL Testing

See `scripts/test-bulk-api.sh` for comprehensive curl examples.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/bulk-gpt-app/issues)
- **Documentation**: [/docs](/docs)
- **API Reference**: This document

---

**Last Updated**: 2025-10-31
