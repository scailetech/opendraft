import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'
import { logPerformance, logError } from '@/lib/utils/logger'

const BUCKET_NAME = 'context-files'

/**
 * GET /api/context-files
 * Lists all context files for the authenticated user
 */
export async function GET(request: NextRequest): Promise<Response> {
  let userId: string | null = null

  try {
    userId = await authenticateRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

    // DEV MODE: Return empty file list
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      return NextResponse.json({ files: [] })
    }

    const supabase = await createServerSupabaseClient()

    // Performance timing
    const timings = {
      authStart: Date.now(),
      authEnd: 0,
      listStart: 0,
      listEnd: 0,
      transformStart: 0,
      transformEnd: 0,
    }

    // List files in user's folder
    // Optimize: Only fetch what we need, no sorting (client can sort)
    timings.listStart = Date.now()
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId, {
        limit: 100,
        offset: 0,
        // Remove sortBy - let client sort (faster query)
      })
    timings.listEnd = Date.now()

    if (error) {
      logError('Supabase storage list error', error)
      return NextResponse.json(
        { error: 'Failed to list files', details: error.message },
        { status: 500 }
      )
    }

    // Transform to our format
    timings.transformStart = Date.now()
    const files = (data || []).map((file) => {
      // Extract original filename (remove timestamp prefix: timestamp-filename)
      const parts = file.name.split('-')
      const originalName = parts.length > 1 ? parts.slice(1).join('-') : file.name
      
      // Parse metadata
      let fileType: 'input' | 'output' | 'manual' = 'manual'
      let tags: string[] = []
      let metadata: Record<string, unknown> = {}
      
      if (file.metadata) {
        if (typeof file.metadata === 'string') {
          try {
            metadata = JSON.parse(file.metadata)
          } catch {
            // Not JSON, ignore
          }
        } else if (typeof file.metadata === 'object') {
          metadata = file.metadata
        }
        
        fileType = (metadata.fileType && ['input', 'output', 'manual'].includes(metadata.fileType as string)) 
          ? (metadata.fileType as 'input' | 'output' | 'manual')
          : 'manual'
        tags = Array.isArray(metadata.tags) ? metadata.tags : []
      }
      
      return {
        id: `${userId}/${file.name}`,
        name: originalName,
        type: metadata.mimetype || 'application/octet-stream',
        size: metadata.size || file.metadata?.size || 0,
        path: `${userId}/${file.name}`,
        uploadedAt: file.created_at || new Date().toISOString(),
        fileType,
        tags,
      }
    })
    timings.transformEnd = Date.now()

    // Log performance metrics
    const totalTime = timings.transformEnd - timings.authStart
    const listTime = timings.listEnd - timings.listStart
    const transformTime = timings.transformEnd - timings.transformStart
    
    logPerformance('Context files fetch', {
      total: `${totalTime}ms`,
      list: `${listTime}ms`,
      transform: `${transformTime}ms`,
      fileCount: files.length,
    })

    // Sort client-side (faster than DB sort for small datasets)
    const sortedFiles = files.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )

    // Add cache headers for browser/CDN caching (short TTL since user-specific)
    return NextResponse.json(
      { files: sortedFiles },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    logError('List files error', error)
    return NextResponse.json(
      {
        error: 'Failed to list files',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/context-files
 * Deletes a context file
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  let userId: string | null = null

  try {
    userId = await authenticateRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { filePath } = body

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json(
        { error: 'filePath is required' },
        { status: 400 }
      )
    }

    // Verify file belongs to user
    if (!filePath.startsWith(`${userId}/`)) {
      return NextResponse.json(
        { error: 'Unauthorized - file does not belong to user' },
        { status: 403 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      logError('Supabase storage delete error', error)
      return NextResponse.json(
        { error: 'Failed to delete file', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Delete file error', error)
    return NextResponse.json(
      {
        error: 'Failed to delete file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

