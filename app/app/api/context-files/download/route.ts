import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'
import { logError } from '@/lib/utils/logger'

const BUCKET_NAME = 'context-files'

/**
 * GET /api/context-files/download
 * Downloads a context file from Supabase storage
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

    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json(
        { error: 'path parameter is required' },
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

    // Get file metadata to determine content type
    const { data: metadata } = await supabase.storage
      .from(BUCKET_NAME)
      .list(filePath.split('/')[0], {
        search: filePath.split('/').slice(1).join('/')
      })

    // Download file from storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath)

    if (error) {
      logError('Supabase storage download error', error)
      return NextResponse.json(
        { error: 'Failed to download file', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Convert blob to buffer
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract filename from path
    const filename = filePath.split('/').pop() || 'file.csv'
    // Remove timestamp prefix if present
    const parts = filename.split('-')
    const originalName = parts.length > 1 ? parts.slice(1).join('-') : filename

    // Determine content type from file extension or metadata
    let contentType = 'text/csv'
    if (metadata && metadata.length > 0) {
      const fileMetadata = metadata[0]
      if (fileMetadata.metadata?.mimetype) {
        contentType = fileMetadata.metadata.mimetype as string
      }
    } else {
      // Fallback to extension-based detection
      const ext = originalName.split('.').pop()?.toLowerCase()
      const mimeTypes: Record<string, string> = {
        'csv': 'text/csv',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
      contentType = (ext && mimeTypes[ext]) || 'application/octet-stream'
    }

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${originalName}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    logError('Download file error', error)
    return NextResponse.json(
      {
        error: 'Failed to download file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

