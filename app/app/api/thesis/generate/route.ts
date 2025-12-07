/**
 * API Route: Generate Thesis - SIMPLE VERSION
 * Just create the entry and trigger Modal
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, academic_level = 'master', language = 'en', author_name, email = 'app@opendraft.ai' } = body
    
    if (!topic) {
      return NextResponse.json({ error: 'Missing topic' }, { status: 400 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Simple insert with all required fields
    const { data: thesis, error } = await supabase
      .from('waitlist')
      .insert({
        email,
        full_name: author_name || 'App User',
        thesis_topic: topic,
        academic_level,
        language,
        status: 'waiting',
        email_verified: true,
        verified_at: new Date().toISOString(),
        position: 0,
        original_position: 0,
        referral_code: `APP${Date.now().toString(36).toUpperCase()}`, // Dummy code for app users
      })
      .select()
      .single()
    
    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log(`📝 Created thesis: ${thesis.id}`)
    
    // Trigger Modal in background (fire and forget)
    fetch('http://localhost:3001/api/thesis/trigger-modal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thesis_id: thesis.id }),
    }).catch(() => console.log('Trigger sent'))
    
    return NextResponse.json({
      success: true,
      thesis_id: thesis.id,
      message: 'Thesis started!',
    })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    )
  }
}
