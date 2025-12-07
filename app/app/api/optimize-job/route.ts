import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { ALL_GTM_TOOLS } from '@/lib/types/gtm-types'
import { logError, logDebug } from '@/lib/utils/logger'
import { authenticateRequest } from '@/lib/auth-middleware'

// ABOUTME: Server-side API route for AI-powered job optimization
// ABOUTME: Analyzes user prompts and suggests improvements + output columns + tool suggestions

// Simple in-memory rate limiter for this endpoint
// Limits: 10 requests per user per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()

function checkOptimizeRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)
  
  if (!userLimit || now - userLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitMap.set(userId, { count: 1, windowStart: now })
    return { allowed: true }
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - userLimit.windowStart)) / 1000)
    return { allowed: false, retryAfter }
  }
  
  userLimit.count++
  return { allowed: true }
}

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(rateLimitMap.entries())
  for (const [key, value] of entries) {
    if (now - value.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000)

const SYSTEM_PROMPT = `You are a bulk data processing expert. Analyze the user's job and optimize it holistically.

Given:
- User's raw prompt (may be vague or unclear)
- Available CSV columns
- Sample CSV rows (first few rows with actual data values) - use this to identify which columns have content vs empty
- Currently selected input columns (which columns user wants in output)
- Available Gemini native tools (built-in capabilities)

Your task (based on what user wants optimized):
1. If optimizing INPUT: Suggest which input columns to include/exclude (some may be redundant like IDs, timestamps, or not needed for the task)
2. If optimizing TASK: Improve the prompt for clarity and effectiveness, ensuring column references use {{variable}} syntax
3. If optimizing OUTPUT: Suggest 2-5 output columns and 0-3 Gemini native tools

Return JSON (only include fields that were optimized):
{
  "suggestedInputColumns": ["name", "email", "company"], // if optimizing input
  "optimizedPrompt": "prompt with {{column_name}} placeholders for CSV data", // if optimizing task
  "outputColumns": [ // if optimizing output
    {"name": "column_name", "description": "what this contains"}
  ],
  "suggestedTools": ["tool-name-1"], // if optimizing output
  "reasoning": "Brief explanation of all optimizations made"
}

CRITICAL RULES FOR optimizedPrompt:
- CONVERT any column name references to {{column_name}} template syntax
- Example: "analyze the title column" → "analyze {{title}}"
- Example: "using \`title\`, \`url\`" → "using {{title}}, {{url}}"
- The {{column_name}} placeholders will be replaced with actual CSV row values at runtime
- ALWAYS wrap suggested input columns in {{}} when referenced in the prompt
- If user mentions a column like "title" or "content_preview", output it as {{title}} or {{content_preview}}

Guidelines:
- For input columns: Exclude redundant/internal columns (IDs, timestamps, metadata) unless needed. Use sample rows to identify which columns have data.
- For output columns: Match the prompt's natural outputs
- CRITICAL: For each output column description, ALWAYS specify the EXACT expected format:
  - For numbers/prices: "Numeric value only (e.g., 429.24)" - never include context like "On date, the price was..."
  - For dates: "Date format: Month D, YYYY (e.g., December 3, 2025)" - no zero-padding
  - For translations: "Just the translated word/phrase" - no explanations
  - For scores: "Score from 1-10 as integer" or "Rating: 'low', 'medium', or 'high' (exact casing)"
  - For categories: List ALL valid values, e.g., "One of: 'positive', 'negative', 'neutral'"
  - For text: Specify length/format, e.g., "One sentence summary" or "Comma-separated list"
  - For boolean: "true or false (lowercase)"
  - NEVER allow verbose responses like "The X is Y" - always just the value
  - This ensures CONSISTENT output format across all rows
- Two tools available: "web-search" and "scrape-page"
- Suggest "web-search" when:
  - Task involves LEADS, COMPANIES, or PEOPLE where enrichment would help (e.g., ICP analysis, lead scoring)
  - Task needs current/live information not in CSV (funding, news, company size, recent events)
  - Task would benefit from external context about entities mentioned in the data
- Suggest "scrape-page" when:
  - CSV contains URLs, domains, or website columns that should be scraped
  - Task involves evaluating websites, landing pages, team members, or online presence
  - Need to extract specific content from webpages (including JavaScript-rendered pages)
- DO NOT suggest tools when:
  - Task is purely about formatting, categorizing, or transforming existing text data
  - All information needed is already complete in the CSV (e.g., simple text analysis)
- For LEAD/ICP/COMPANY analysis: Almost always suggest "web-search" - live company info is valuable!
- If entity has a website/domain column, also suggest "scrape-page" for deeper analysis
- Optimize for Gemini's structured output capabilities`

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require authentication - this endpoint uses GEMINI_API_KEY
    let userId: string
    try {
      const authResult = await authenticateRequest(req)
      if (!authResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = authResult
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SECURITY: Rate limit to prevent API abuse (10 requests/minute per user)
    const rateLimit = checkOptimizeRateLimit(userId)
    if (!rateLimit.allowed) {
      logDebug(`Rate limit exceeded for optimize-job`, { userId, retryAfter: rateLimit.retryAfter })
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', retryAfter: rateLimit.retryAfter },
        { 
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter || 60) }
        }
      )
    }

    const { 
      prompt, 
      csvColumns, 
      sampleRows = [],
      optimizeInput = false,
      optimizeTask = false,
      optimizeOutput = false,
      selectedInputColumns = []
    } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid prompt provided' },
        { status: 400 }
      )
    }

    if (!csvColumns || !Array.isArray(csvColumns)) {
      return NextResponse.json(
        { error: 'Invalid csvColumns provided' },
        { status: 400 }
      )
    }

    // At least one optimization must be requested
    if (!optimizeInput && !optimizeTask && !optimizeOutput) {
      return NextResponse.json(
        { error: 'At least one optimization option must be selected' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      logError('GEMINI_API_KEY not configured')
      return NextResponse.json(
        { error: 'API not configured', fallback: true },
        { status: 500 }
      )
    }

    // Initialize Gemini client - using lite model for faster optimization
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    // Prepare Gemini native tools list for AI context
    const toolsList = ALL_GTM_TOOLS.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')

    // Build optimization context
    const optimizationContext = []
    if (optimizeInput) {
      optimizationContext.push(`- Optimize INPUT columns (currently selected: ${selectedInputColumns.join(', ') || 'all'})`)
    }
    if (optimizeTask) {
      optimizationContext.push(`- Optimize TASK prompt: "${prompt}"`)
    }
    if (optimizeOutput) {
      optimizationContext.push(`- Optimize OUTPUT columns and tools`)
    }

    // Format sample rows for AI context (show first 3-5 rows to understand data content)
    const sampleRowsText = sampleRows && sampleRows.length > 0
      ? `\n\nSample CSV data (first ${Math.min(sampleRows.length, 5)} rows to understand content):
${sampleRows.slice(0, 5).map((row: Record<string, string>, idx: number) => {
  const rowData = Object.entries(row)
    .map(([key, value]) => `  ${key}: "${value || '(empty)'}"`)
    .join('\n')
  return `Row ${idx + 1}:\n${rowData}`
}).join('\n\n')}`
      : '\n\nNote: No sample rows provided - analyze columns based on names only.'

    // Combine system prompt + user prompt into single text (no systemInstruction support)
    const fullPrompt = `${SYSTEM_PROMPT}

---

Optimization requested:
${optimizationContext.join('\n')}

User prompt: "${prompt}"
All CSV columns: ${csvColumns.join(', ')}
Currently selected input columns: ${selectedInputColumns.length > 0 ? selectedInputColumns.join(', ') : 'all'}${sampleRowsText}

Available Gemini Native Tools:
${toolsList}

Optimize the requested aspects and return JSON.`

    // Call Gemini with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

    try {
      const result = await model.generateContent(fullPrompt)

      clearTimeout(timeoutId)

      const text = result.response.text()

      // Extract JSON from potential markdown code block
      let jsonText = text.trim()
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '')
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '')
      }

      const parsed = JSON.parse(jsonText)

      // Validate response structure - must have reasoning
      if (!parsed.reasoning) {
        throw new Error('Invalid response structure from Gemini - missing reasoning')
      }

      // Validate optimized prompt if task optimization was requested
      if (optimizeTask && parsed.optimizedPrompt && typeof parsed.optimizedPrompt !== 'string') {
        throw new Error('Invalid optimizedPrompt in response')
      }

      // Validate output columns if output optimization was requested
      if (optimizeOutput && parsed.outputColumns && !Array.isArray(parsed.outputColumns)) {
        throw new Error('Invalid outputColumns in response')
      }

      // Validate suggested input columns if input optimization was requested
      if (optimizeInput && parsed.suggestedInputColumns && !Array.isArray(parsed.suggestedInputColumns)) {
        throw new Error('Invalid suggestedInputColumns in response')
      }

      // Ensure suggestedTools is an array (default to empty if not provided)
      if (!parsed.suggestedTools || !Array.isArray(parsed.suggestedTools)) {
        parsed.suggestedTools = []
      }

      // Validate that suggested tools exist in ALL_GTM_TOOLS
      const validToolNames = ALL_GTM_TOOLS.map(t => t.name)
      parsed.suggestedTools = parsed.suggestedTools.filter((tool: string) =>
        validToolNames.includes(tool)
      )

      // Validate that suggested input columns exist in csvColumns
      if (parsed.suggestedInputColumns && Array.isArray(parsed.suggestedInputColumns)) {
        parsed.suggestedInputColumns = parsed.suggestedInputColumns.filter((col: string) =>
          csvColumns.includes(col)
        )
      }

      return NextResponse.json(parsed)
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  } catch (error) {
    logError('Optimization error', error)

    // Return fallback indicating optimization failed
    return NextResponse.json(
      {
        error: 'Optimization failed',
        fallback: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
