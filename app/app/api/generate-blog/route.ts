import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300 // 5 minutes for comprehensive blog generation

interface BusinessContext {
  companyName: string | null
  companyWebsite: string | null
  targetIndustries: string | null
  productDescription: string | null
  products: string | null
  targetAudience: string | null
  competitors: string | null
  brandTone: string | null
  painPoints: string | null
  valuePropositions: string | null
  useCases: string | null
  contentThemes: string | null
}

interface BlogRequest {
  keyword: string
  word_count: number
  tone?: string
  system_prompts?: string[]
  additional_instructions?: string
  company_name: string
  company_url: string
  apiKey: string
  business_context: BusinessContext
  language?: string
  country?: string
  batch_mode?: boolean
  batch_keywords?: Array<{ 
    keyword: string
    word_count?: number
    instructions?: string
  }>
}

interface ExistingBlogSlug {
  slug: string
  title: string
  keyword: string
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: BlogRequest = await request.json()
    const { 
      keyword, 
      word_count,
      tone = 'professional',
      system_prompts = [],
      additional_instructions, 
      company_name, 
      company_url, 
      apiKey: clientApiKey, 
      business_context,
      language = 'en',
      country = 'US',
      batch_mode = false,
      batch_keywords = []
    } = body

    if (!keyword || !company_name || !company_url) {
      return NextResponse.json(
        { error: 'Keyword, company name, and URL are required' },
        { status: 400 }
      )
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is required. Please set it in Settings or GEMINI_API_KEY environment variable.' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    try {
      // Use OpenBlog Modal endpoint
      const BLOG_WRITER_ENDPOINT = 'https://clients--blog-writer-fastapi-app.modal.run'

      // Prepare company data in OpenBlog format
      const companyData = {
        description: business_context.productDescription || business_context.companyName,
        industry: business_context.targetIndustries,
        target_audience: business_context.targetAudience ? [business_context.targetAudience] : [],
        competitors: business_context.competitors ? business_context.competitors.split(',').map(c => c.trim()) : [],
      }

      // Single blog generation
      if (!batch_mode) {
        const requestBody = {
          primary_keyword: keyword,
          company_url: company_url,
          company_name: company_name,
          language: language,
          country: country,
          word_count: word_count,
          tone: tone,
          system_prompts: system_prompts,
          content_generation_instruction: additional_instructions,
          company_data: companyData,
          index: true,
        }

        const response = await fetch(`${BLOG_WRITER_ENDPOINT}/write`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`OpenBlog API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        // Transform OpenBlog response to our format
        const generationTime = (Date.now() - startTime) / 1000

        return NextResponse.json({
          title: data.headline || data.meta_title || keyword,
          content: data.html_content || '',
          metadata: {
            keyword: keyword,
            word_count: data.validated_article?.word_count || 0,
            generation_time: generationTime,
            company_name: company_name,
            company_url: company_url,
            aeo_score: data.aeo_score || 0,
            job_id: data.job_id,
            slug: data.slug,
            meta_title: data.meta_title,
            meta_description: data.meta_description,
            read_time: data.read_time,
          },
        })
      } 
      
      // Batch blog generation
      else {
        const batchId = `batch-${Date.now()}`
        const results = []

        // Generate all blogs in batch
        for (let i = 0; i < batch_keywords.length; i++) {
          const batchKeyword = batch_keywords[i]
          
          // Prepare sibling blogs for internal linking
          const batchSiblings: ExistingBlogSlug[] = batch_keywords
            .filter((_, idx) => idx !== i)
            .map((kw, idx) => ({
              slug: kw.keyword.toLowerCase().replace(/\s+/g, '-'),
              title: kw.keyword,
              keyword: kw.keyword,
            }))

          // Combine global instructions with per-keyword instructions
          const combinedInstructions = [
            additional_instructions,
            batchKeyword.instructions
          ].filter(Boolean).join('\n\n')

          const requestBody = {
            primary_keyword: batchKeyword.keyword,
            company_url: company_url,
            company_name: company_name,
            language: language,
            country: country,
            word_count: batchKeyword.word_count || word_count,
            tone: tone,
            system_prompts: system_prompts,
            content_generation_instruction: combinedInstructions || undefined,
            company_data: companyData,
            batch_id: batchId,
            batch_siblings: batchSiblings,
            index: true,
          }

          const response = await fetch(`${BLOG_WRITER_ENDPOINT}/write`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          })

          if (response.ok) {
            const data = await response.json()
            results.push({
              keyword: batchKeyword.keyword,
              title: data.headline || data.meta_title,
              content: data.html_content,
              word_count: data.validated_article?.word_count || 0,
              aeo_score: data.aeo_score || 0,
              job_id: data.job_id,
              slug: data.slug,
            })
          } else {
            results.push({
              keyword: batchKeyword.keyword,
              error: `Failed to generate: ${response.status}`,
            })
          }
        }

        const generationTime = (Date.now() - startTime) / 1000

        return NextResponse.json({
          batch_id: batchId,
          total: batch_keywords.length,
          successful: results.filter(r => !r.error).length,
          failed: results.filter(r => r.error).length,
          results: results,
          generation_time: generationTime,
        })
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Blog generation error:', error)
        return NextResponse.json(
          {
            error: 'Failed to generate blog',
            message: error.message,
          },
          { status: 500 }
        )
      }

      console.error('Blog generation error:', error)
      return NextResponse.json(
        {
          error: 'Failed to generate blog',
          message: 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Blog generation error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate blog',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
