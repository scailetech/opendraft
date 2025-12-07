/**
 * ABOUTME: Cancel a running batch
 * ABOUTME: Sets batch status to 'cancelled' to stop Modal processing
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'
import { logError, logDebug } from '@/lib/utils/logger'

export const maxDuration = 30

/**
 * POST /api/batch/[batchId]/cancel
 * Cancel a running batch
 * 
 * This sets the batch status to 'cancelled', which:
 * 1. Stops Modal from picking up pending rows
 * 2. Prevents new rows from being processed
 * 3. Already-processing rows may complete
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { batchId: string } }
): Promise<Response> {
  const startTime = Date.now()
  
  try {
    // Authenticate request
    const userId = await authenticateRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in or provide valid Bearer token/API key' },
        { status: 401 }
      )
    }

    const batchId = params.batchId

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      )
    }

    // Get batch and verify ownership
    const { data: batch, error: fetchError } = await supabaseAdmin
      .from('batches')
      .select('id, user_id, status')
      .eq('id', batchId)
      .single()

    if (fetchError || !batch) {
      logError('Batch not found for cancellation', fetchError, { batchId })
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      )
    }

    // Verify user owns this batch
    if (batch.user_id !== userId) {
      logError('Unauthorized batch cancel attempt', null, { batchId, userId, ownerUserId: batch.user_id })
      return NextResponse.json(
        { error: 'Unauthorized - you do not have access to this batch' },
        { status: 403 }
      )
    }

    // Check if batch can be cancelled
    const cancellableStatuses = ['pending', 'processing']
    if (!cancellableStatuses.includes(batch.status)) {
      return NextResponse.json(
        { 
          error: `Cannot cancel batch with status '${batch.status}'`,
          message: `Batch is already ${batch.status}`
        },
        { status: 400 }
      )
    }

    // Update batch status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from('batches')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId)
      .eq('user_id', userId)

    if (updateError) {
      logError('Failed to cancel batch', updateError, { batchId })
      return NextResponse.json(
        { error: 'Failed to cancel batch' },
        { status: 500 }
      )
    }

    // Also mark pending results as cancelled
    const { error: resultsError } = await supabaseAdmin
      .from('batch_results')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('batch_id', batchId)
      .eq('status', 'pending')

    if (resultsError) {
      logDebug('Warning: Could not update pending results to cancelled', { batchId, error: resultsError })
      // Don't fail the request - batch is already cancelled
    }

    const totalTime = Date.now() - startTime
    logDebug(`[PERF] Batch cancellation: ${totalTime}ms`, { batchId })

    return NextResponse.json({
      success: true,
      message: 'Batch cancelled successfully',
      batchId,
      previousStatus: batch.status,
      newStatus: 'cancelled'
    })

  } catch (error) {
    logError('Unexpected error during batch cancellation', error, { batchId: params.batchId })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



