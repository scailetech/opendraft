import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * POST /api/generate-keywords
 * Generates AEO-optimized keywords for maximum AI visibility
 * Focuses on conversational, question-based queries for Answer Engines
 * Standalone version - no Modal dependency
 */

export const maxDuration = 60

interface KeywordRequest {
  company_name: string
  company_url: string
  language: string
  country: string
  num_keywords: number
  apiKey: string
  // Rich context from company analysis
  description?: string
  products?: string
  target_audience?: string
  competitors?: string
  pain_points?: string
  value_propositions?: string
  use_cases?: string
  content_themes?: string
  tone?: string
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: KeywordRequest = await request.json()
    const {
      company_name,
      company_url,
      language,
      country,
      num_keywords,
      apiKey: clientApiKey,
      description,
      products,
      target_audience,
      competitors,
      pain_points,
      value_propositions,
      use_cases,
      content_themes,
      tone
    } = body

    // Validation
    if (!company_name || !company_url) {
      return NextResponse.json(
        { error: 'Company name and URL are required' },
        { status: 400 }
      )
    }

    // Use client-provided API key, or fallback to server env
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is required. Please set it in Settings or GEMINI_API_KEY environment variable.' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    try {
      // Use Gemini 3 Pro to generate keywords
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' })

      const prompt = `You are an AEO (Answer Engine Optimization) expert. Generate ${num_keywords || 50} highly strategic keywords to maximize AI visibility for this company.

# COMPANY PROFILE
Name: ${company_name}
URL: ${company_url}
Language: ${language || 'English'}
Country: ${country || 'Global'}

${description ? `\nDescription: ${description}` : ''}
${products ? `\nProducts/Services: ${products}` : ''}
${target_audience ? `\nTarget Audience: ${target_audience}` : ''}
${competitors ? `\nCompetitors: ${competitors}` : ''}

${pain_points ? `\n# CUSTOMER PAIN POINTS (Target these with keywords)
${pain_points}` : ''}

${value_propositions ? `\n# VALUE PROPOSITIONS (Highlight these benefits)
${value_propositions}` : ''}

${use_cases ? `\n# USE CASES (Create keywords around these scenarios)
${use_cases}` : ''}

${content_themes ? `\n# CONTENT THEMES (Focus keywords on these topics)
${content_themes}` : ''}

${tone ? `\nBrand Tone: ${tone}` : ''}

# AEO STRATEGY
Answer Engines (Perplexity, ChatGPT, Claude, Gemini) rank based on:
1. **Conversational queries** - Natural language questions users ask AI
2. **Problem-solution match** - Keywords addressing specific pain points
3. **Use case relevance** - Queries matching real user scenarios
4. **Topical authority** - Keywords within defined content themes

# KEYWORD REQUIREMENTS
For each keyword, provide:
- **keyword**: Conversational query targeting pain points, use cases, or themes
- **intent**: ["question", "commercial", "transactional", "comparison", "informational"]
- **score**: 0-100 (company-fit/relevance score)
- **cluster_name**: Semantic topic cluster (e.g., "Product Features", "Pain Points", "How-To Guides")
- **is_question**: true/false (is this a question-based keyword?)
- **source**: "ai_generated" (use this for all generated keywords)
- **volume**: 0 (leave as 0 for now, can be enriched later)
- **difficulty**: 0 (leave as 0 for now, can be enriched later)
- **aeo_opportunity**: 0-100 (AEO opportunity score based on question format, intent, and relevance)
- **has_featured_snippet**: false (leave as false for now)
- **has_paa**: false (leave as false for now)
- **serp_analyzed**: false (leave as false for now)

# DISTRIBUTION TARGET
- 40% Questions addressing pain points (intent: question, informational)
- 20% Commercial intent (best, top, review)
- 20% Problem-solving/comparison keywords
- 10% Transactional keywords
- 10% How-to/definitions

# OUTPUT FORMAT
Return ONLY valid JSON (no markdown):
{
  "keywords": [
    {
      "keyword": "example question",
      "intent": "question",
      "score": 95,
      "cluster_name": "Pain Points",
      "is_question": true,
      "source": "ai_generated",
      "volume": 0,
      "difficulty": 0,
      "aeo_opportunity": 85,
      "has_featured_snippet": false,
      "has_paa": false,
      "serp_analyzed": false
    }
  ]
}

Generate strategic keywords that will make AI platforms cite ${company_name} as the authoritative answer.`

      const result = await model.generateContent(prompt)
      const responseText = result.response.text()
      
      // Try to extract JSON from response
      let jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from Gemini response')
      }

      const data = JSON.parse(jsonMatch[0])
      
      // Validate response structure
      if (!data.keywords || !Array.isArray(data.keywords)) {
        throw new Error('Invalid response format from Gemini')
      }

      const generationTime = (Date.now() - startTime) / 1000

      return NextResponse.json({
        keywords: data.keywords,
        metadata: {
          company_name,
          company_url,
          total_keywords: data.keywords.length,
          generation_time: generationTime,
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('Invalid')) {
          return NextResponse.json(
            { error: 'Invalid Gemini API key. Please check your key in Profile settings.' },
            { status: 401 }
          )
        }
        
        console.error('Keyword generation error:', error)
        return NextResponse.json(
          {
            error: 'Failed to generate keywords',
            message: error.message,
          },
          { status: 500 }
        )
      }

      console.error('Keyword generation error:', error)
      return NextResponse.json(
        {
          error: 'Failed to generate keywords',
          message: 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Keyword generation error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate keywords',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

