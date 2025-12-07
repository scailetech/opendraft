import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'
import { logError } from '@/lib/utils/logger'

const BUCKET_NAME = 'context-files'

/**
 * PATCH /api/context-files/update-tags
 * Updates tags for a file by updating its metadata
 */
export async function PATCH(request: NextRequest): Promise<Response> {
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
    const { filePath, tags } = body

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json(
        { error: 'filePath is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: 'tags must be an array' },
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

    // Get current file metadata
    const { data: fileData, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId, {
        search: filePath.split('/').pop() || '',
      })

    if (listError || !fileData || fileData.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    const file = fileData[0]
    const currentMetadata = typeof file.metadata === 'object' 
      ? (file.metadata as Record<string, unknown>) 
      : file.metadata 
        ? JSON.parse(file.metadata as string)
        : {}

    // Update metadata with tags
    const updatedMetadata = {
      ...currentMetadata,
      tags: tags.filter(Boolean), // Remove empty tags
    }

    // Update file metadata
    // Note: Supabase Storage doesn't have a direct update metadata endpoint
    // We need to copy the file with new metadata
    const { data: fileContent, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath)

    if (downloadError || !fileContent) {
      return NextResponse.json(
        { error: 'Failed to read file' },
        { status: 500 }
      )
    }

    const buffer = Buffer.from(await fileContent.arrayBuffer())

    // Remove old file and upload with new metadata
    await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: currentMetadata.mimetype || 'application/octet-stream',
        upsert: true,
        metadata: updatedMetadata,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to update tags', details: uploadError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, tags })
  } catch (error) {
    logError('Update tags error', error)
    return NextResponse.json(
      {
        error: 'Failed to update tags',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

