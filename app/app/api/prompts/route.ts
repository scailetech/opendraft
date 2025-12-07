import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logPerformance, logError } from '@/lib/utils/logger'

export async function GET() {
  const startTime = Date.now()
  try {
    const supabase = await createClient()
    
    const authStart = Date.now()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const authTime = Date.now() - authStart
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const queryStart = Date.now()
    const { data: prompts, error } = await supabase
      .from('saved_prompts')
      .select('*')
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    const queryTime = Date.now() - queryStart

    if (error) {
      logError('Error fetching prompts', error)
      return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 })
    }

    const totalTime = Date.now() - startTime
    logPerformance('Saved prompts fetch', {
      total: `${totalTime}ms`,
      auth: `${authTime}ms`,
      query: `${queryTime}ms`,
      promptCount: prompts?.length || 0,
    })

    return NextResponse.json(
      { prompts: prompts || [] },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    logError('Unexpected error in GET /api/prompts', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, prompt, description, tags } = body

    if (!name || !prompt) {
      return NextResponse.json({ error: 'Name and prompt are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('saved_prompts')
      .insert({
        user_id: user.id,
        name,
        prompt,
        description: description || null,
        tags: tags || [],
      })
      .select()
      .single()

    if (error) {
      logError('Error saving prompt', error)
      return NextResponse.json({ error: 'Failed to save prompt' }, { status: 500 })
    }

    return NextResponse.json({ prompt: data })
  } catch (error) {
    logError('Unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

