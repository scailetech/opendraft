import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * POST /api/analyse-website
 * Analyzes a website URL and extracts company context using Gemini 3.0 Pro Preview
 * Uses urlContext + googleSearch for comprehensive single-phase analysis
 */

export const maxDuration = 60

// Schema for structured output
const schema = {
  type: 'object',
  properties: {
    company_name: { type: 'string', description: 'Official company name' },
    company_url: { type: 'string', description: 'Company website URL' },
    industry: { type: 'string', description: 'Primary industry (e.g., SaaS, Marketing, AI)' },
    description: { type: 'string', description: 'Clear 2-3 sentence description' },
    products: { 
      type: 'array', 
      items: { type: 'string' },
      description: 'Main products/services'
    },
    target_audience: { type: 'string', description: 'Ideal customer profile' },
    competitors: { 
      type: 'array', 
      items: { type: 'string' },
      description: 'Main competitors'
    },
    tone: { type: 'string', description: 'Brand voice (e.g., professional, friendly, technical)' },
    pain_points: {
      type: 'array',
      items: { type: 'string' },
      description: 'Key customer problems/challenges they solve'
    },
    value_propositions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Unique benefits and differentiators'
    },
    use_cases: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific scenarios or applications'
    },
    content_themes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Topics/themes they want to be known for'
    }
  },
  required: ['company_name', 'company_url', 'industry', 'description']
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json()
    const { url, apiKey: clientApiKey } = body

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Use client-provided API key, or fallback to server env
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'Gemini API key is required. Please set it in Settings or GEMINI_API_KEY environment variable.' },
        { status: 400 }
      )
    }

    // Normalize URL
    const normalizedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`

    try {
      // Use Gemini 3.0 Pro Preview with urlContext + googleSearch
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-3-pro-preview',
        tools: [
          {
            urlContext: {}
          },
          {
            googleSearch: {}
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.2
        }
      })

      const prompt = `Analyze the company at ${normalizedUrl} comprehensively.

STEP 1: Visit and read the website at ${normalizedUrl}
- Use URL context to access and understand the actual website content
- Extract information about their products, services, messaging, and brand tone

STEP 2: Use Google Search to find:
- Main direct competitors in their exact space
- Industry positioning and market context
- Additional validation of their offerings

STEP 3: Synthesize into structured output
Provide complete, accurate information for all fields based on BOTH the website content AND search results.`

      const result = await model.generateContent(prompt)
      const responseText = result.response.text()
      
      // Parse JSON response (Gemini 3 Pro returns clean JSON with responseSchema)
      const data = JSON.parse(responseText)
      return NextResponse.json(data)
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()
        
        // API key errors
        if (errorMessage.includes('api key') || 
            errorMessage.includes('invalid') ||
            errorMessage.includes('unauthorized')) {
          return NextResponse.json(
            { error: 'Invalid Gemini API key. Please check your key in Settings.' },
            { status: 401 }
          )
        }
        
        console.error('Website analysis error:', error)
        return NextResponse.json(
          {
            error: 'Failed to analyze website',
            message: error.message,
          },
          { status: 500 }
        )
      }

      console.error('Website analysis error:', error)
      return NextResponse.json(
        {
          error: 'Failed to analyze website',
          message: 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Request parsing error:', error)
    return NextResponse.json(
      {
        error: 'Invalid request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    )
  }
}
