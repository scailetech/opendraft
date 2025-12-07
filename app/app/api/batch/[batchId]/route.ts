import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: { batchId: string } }
) {
  try {
    const startTime = Date.now()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const batchId = params.batchId

    // SECURITY: First verify user owns this batch BEFORE deleting anything
    const { data: batch, error: fetchError } = await supabase
      .from('batches')
      .select('id, user_id')
      .eq('id', batchId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !batch) {
      return NextResponse.json(
        { error: 'Batch not found or access denied' },
        { status: 404 }
      )
    }

    // Now safe to delete batch results (user ownership verified)
    await supabase
      .from('batch_results')
      .delete()
      .eq('batch_id', batchId)

    // Delete the batch
    const { error: deleteError } = await supabase
      .from('batches')
      .delete()
      .eq('id', batchId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('[ERROR] Batch deletion failed:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete batch' },
        { status: 500 }
      )
    }

    const totalTime = Date.now() - startTime
    console.log(`[PERF] Batch deletion: ${totalTime}ms`)

    return NextResponse.json({
      success: true,
      message: 'Batch deleted successfully'
    })
  } catch (error) {
    console.error('[ERROR] Unexpected error during batch deletion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
