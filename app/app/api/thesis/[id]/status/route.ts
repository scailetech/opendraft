/**
 * API Route: Get Thesis Status
 * Returns current progress and status from Supabase
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data, error } = await supabase
      .from('waitlist')
      .select('status, current_phase, progress_percent, sources_count, chapters_count, progress_details, pdf_url, docx_url, zip_url, error_message, processing_started_at, completed_at')
      .eq('id', params.id)
      .single()
    
    if (error) throw error
    
    if (!data) {
      return NextResponse.json(
        { error: 'Thesis not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Status fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch thesis status' },
      { status: 500 }
    )
  }
}

