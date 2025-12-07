/**
 * Trigger Modal Function Immediately
 * Calls Modal CLI to spawn thesis generation instantly
 */

import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { thesis_id } = await request.json()
    
    if (!thesis_id) {
      return NextResponse.json({ error: 'Missing thesis_id' }, { status: 400 })
    }
    
    // Trigger Modal function via CLI
    const command = `cd /Users/federicodeponte/opendraft-fixes/backend && /opt/homebrew/bin/python3.10 -m modal run modal_worker.py::daily_thesis_batch &`
    
    console.log(`🚀 Triggering Modal for thesis ${thesis_id}`)
    
    try {
      execAsync(command)
      console.log(`✅ Modal triggered successfully`)
      
      return NextResponse.json({
        success: true,
        message: 'Modal function triggered'
      })
    } catch (error) {
      console.error('Modal trigger error:', error)
      return NextResponse.json({
        success: false,
        message: 'Could not trigger Modal, will be processed by batch'
      })
    }
    
  } catch (error) {
    console.error('Trigger error:', error)
    return NextResponse.json(
      { error: 'Failed to trigger' },
      { status: 500 }
    )
  }
}

