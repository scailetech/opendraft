import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logError } from '@/lib/utils/logger'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, prompt, description, tags } = body

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('saved_prompts')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('saved_prompts')
      .update({
        name,
        prompt,
        description: description || null,
        tags: tags || [],
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logError('Error updating prompt', error)
      return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 })
    }

    return NextResponse.json({ prompt: data })
  } catch (error) {
    logError('Unexpected error updating prompt', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('saved_prompts')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      logError('Error deleting prompt', error)
      return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Unexpected error deleting prompt', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Increment usage count and update last_used_at
export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch current usage_count first
    const { data: current } = await supabase
      .from('saved_prompts')
      .select('usage_count')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    const { error } = await supabase
      .from('saved_prompts')
      .update({
        usage_count: (current?.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      logError('Error updating prompt usage', error)
      return NextResponse.json({ error: 'Failed to update prompt usage' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Unexpected error updating prompt usage', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

