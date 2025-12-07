/**
 * API Route: Get Thesis Content
 * Returns actual sources, chapters, and milestone files
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
    
    // Get thesis metadata
    const { data: thesis } = await supabase
      .from('waitlist')
      .select('status, pdf_url, docx_url, zip_url, progress_details')
      .eq('id', params.id)
      .single()
    
    if (!thesis) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    
    // List milestone files
    const { data: milestoneFiles } = await supabase.storage
      .from('thesis-files')
      .list(`${params.id}/milestones`)
    
    const milestones = milestoneFiles?.map(file => ({
      name: file.name,
      type: file.name.split('_')[0],
    })) || []
    
    // Try to fetch bibliography JSON if it exists
    let sources = []
    try {
      const { data: bibFile } = await supabase.storage
        .from('thesis-files')
        .download(`${params.id}/milestones/research_bibliography.json`)
      
      if (bibFile) {
        const text = await bibFile.text()
        const bibData = JSON.parse(text)
        sources = bibData.citations || bibData.sources || []
      }
    } catch (e) {
      // Bibliography not available yet or doesn't exist
      console.log('Bibliography not available:', e)
    }
    
    return NextResponse.json({
      status: thesis.status,
      pdf_url: thesis.pdf_url,
      docx_url: thesis.docx_url,
      zip_url: thesis.zip_url,
      milestones,
      sources,
      progress_details: thesis.progress_details,
    })
    
  } catch (error) {
    console.error('Content fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}

