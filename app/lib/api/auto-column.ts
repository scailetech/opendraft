/**
 * ABOUTME: Auto-column generation API using Gemini AI
 * ABOUTME: Analyzes CSV headers and generates intelligent prompt templates
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

interface PromptGenerationResult {
  promptTemplate: string
  columnMapping: { [key: string]: string }
}

/**
 * Generate prompt template from CSV headers using Gemini AI
 */
export async function generatePromptTemplate(
  headers: string[]
): Promise<PromptGenerationResult> {
  // Validation
  if (!headers || headers.length === 0) {
    throw new Error('No headers provided')
  }

  // Check for duplicates
  const uniqueHeaders = new Set(headers)
  if (uniqueHeaders.size !== headers.length) {
    throw new Error('Duplicate column names detected')
  }

  // Initialize Gemini
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.7, // Balanced creativity for template generation
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1024,
    },
  })

  // Create column mapping (direct 1:1 mapping)
  const columnMapping: { [key: string]: string } = {}
  headers.forEach((header) => {
    columnMapping[header] = header
  })

  // Identify metadata/technical columns to exclude from template
  const metadataColumns = ['id', 'created_at', 'updated_at', 'status', 'timestamp']
  const relevantHeaders = headers.filter(
    (h) => !metadataColumns.includes(h.toLowerCase())
  )

  // Limit to most relevant columns (max 5-6 for readability)
  const selectedHeaders = relevantHeaders.slice(0, 6)

  // Build system prompt for Gemini
  const systemPrompt = `You are an expert at creating personalized message templates for bulk email/outreach campaigns.

Given these CSV column headers: ${headers.join(', ')}

Task: Generate a natural, conversational prompt template that incorporates the most relevant columns.

Requirements:
1. Use double curly braces for variables: {{column_name}}
2. Only use these columns: ${selectedHeaders.join(', ')}
3. Create a friendly, professional tone appropriate for business outreach
4. Keep it concise (2-3 sentences maximum)
5. Focus on personalization using the available data
6. Do NOT include columns like: id, created_at, updated_at, status
7. Return ONLY the template text, no explanations

Example format:
"Hi {{first_name}}, I noticed you work at {{company}}. I'd love to discuss how we can help with {{industry}}-specific solutions."

Now generate a template for the given headers:`

  try {
    const result = await model.generateContent(systemPrompt)
    const responseText = result.response.text()

    // Clean up response (remove markdown, extra whitespace)
    let promptTemplate = responseText
      .replace(/```.*?\n/g, '') // Remove code block markers
      .replace(/```/g, '')
      .trim()

    // Validate that template contains at least one variable
    if (!promptTemplate.match(/\{\{.+?\}\}/)) {
      // Fallback: create simple template manually
      promptTemplate = createFallbackTemplate(selectedHeaders)
    }

    return {
      promptTemplate,
      columnMapping,
    }
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Fallback template generation if Gemini fails or returns invalid response
 */
function createFallbackTemplate(headers: string[]): string {
  if (headers.length === 0) {
    return 'Hello!'
  }

  // Look for common patterns
  const hasName = headers.find((h) =>
    h.toLowerCase().includes('name') && !h.toLowerCase().includes('company')
  )
  const hasEmail = headers.find((h) => h.toLowerCase().includes('email'))
  const hasCompany = headers.find((h) => h.toLowerCase().includes('company'))

  let template = 'Hello'
  if (hasName) {
    template += ` {{${hasName}}}`
  }
  template += '!'

  if (hasCompany) {
    template += ` I noticed you work at {{${hasCompany}}}.`
  }

  if (hasEmail) {
    template += ` I wanted to reach out regarding your business.`
  }

  return template
}
