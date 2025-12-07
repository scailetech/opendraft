/**
 * ABOUTME: API endpoints for API key management
 * ABOUTME: GET = list keys, POST = create key, DELETE = revoke key
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateApiKey, listApiKeys, revokeApiKey } from '@/lib/api-keys'
import { authenticateRequest } from '@/lib/auth-middleware'
import { logError } from '@/lib/errors'
import { logPerformance } from '@/lib/utils/logger'

/**
 * GET /api/keys - List all API keys for the authenticated user
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  try {
    const authStart = Date.now()
    const userId = await authenticateRequest(request)
    const authTime = Date.now() - authStart

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keysStart = Date.now()
    const keys = await listApiKeys(userId)
    const keysTime = Date.now() - keysStart

    const totalTime = Date.now() - startTime
    logPerformance('API keys fetch', {
      total: `${totalTime}ms`,
      auth: `${authTime}ms`,
      keys: `${keysTime}ms`,
      keyCount: keys?.length || 0,
    })

    return NextResponse.json(
      { keys },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Failed to list API keys'), {
      source: 'api/keys/GET'
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list API keys' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/keys - Generate a new API key
 * Body: { name: string }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      )
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'API key name must be 100 characters or less' },
        { status: 400 }
      )
    }

    const apiKey = await generateApiKey(userId, name.trim())

    return NextResponse.json({
      key: apiKey.key, // Full key returned ONLY on creation
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      createdAt: apiKey.createdAt
    })
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Failed to generate API key'), {
      source: 'api/keys/POST'
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate API key' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/keys - Revoke an API key
 * Body: { keyId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keyId } = body

    if (!keyId || typeof keyId !== 'string') {
      return NextResponse.json(
        { error: 'Key ID is required' },
        { status: 400 }
      )
    }

    await revokeApiKey(userId, keyId)

    return NextResponse.json({ success: true })
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Failed to revoke API key'), {
      source: 'api/keys/DELETE'
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke API key' },
      { status: 500 }
    )
  }
}
