/**
 * API route for Google Sheets integration
 * Handles fetching public Google Sheets (no OAuth required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/errors'
import { authenticateRequest } from '@/lib/auth-middleware'

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

export async function POST(request: NextRequest) {
  let body: { action?: string; spreadsheetId?: string; range?: string } | null = null
  try {
    // SECURITY: Require authentication - uses app's Google API key
    try {
      await authenticateRequest(request)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    body = await request.json()
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    const { action, spreadsheetId, range } = body

    if (!GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      )
    }

    switch (action) {
      case 'fetch': {
        if (!spreadsheetId) {
          return NextResponse.json(
            { error: 'Spreadsheet ID required' },
            { status: 400 }
          )
        }

        // Fetch public sheet data using Google Sheets API (no OAuth token needed)
        // Try a smaller range first (A1:Z100) to avoid quota issues, then expand if needed
        const initialRange = range || 'A1:Z100'
        const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${initialRange}?key=${GOOGLE_API_KEY}`
        
        const response = await fetch(sheetsUrl, {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error?.message || errorData.error || 'Failed to fetch sheet data'
          const errorCode = errorData.error?.code || errorData.error?.status || response.status
          
          // Log the actual error for debugging
          if (process.env.NODE_ENV === 'development') {
            console.debug('[Google Sheets API] Error details:', {
              status: response.status,
              errorCode,
              errorMessage,
              spreadsheetId,
              errorData,
            })
          }
          
          // Handle specific Google API error codes
          if (errorCode === 403 || response.status === 403) {
            // Check for SERVICE_DISABLED first (API not enabled in Google Cloud Console)
            if (
              errorMessage.includes('has not been used') ||
              errorMessage.includes('is disabled') ||
              errorMessage.includes('SERVICE_DISABLED') ||
              errorData.error?.details?.[0]?.reason === 'SERVICE_DISABLED'
            ) {
              // Extract project ID from error if available
              const projectId = errorData.error?.details?.[0]?.metadata?.consumer?.replace('projects/', '') || 
                               errorMessage.match(/project (\d+)/)?.[1] ||
                               'your project'
              
              return NextResponse.json(
                { 
                  error: `Google Sheets API is not enabled for project ${projectId}. The API key belongs to a different project than where the API is enabled. Please use an API key from the project where Google Sheets API is enabled, or enable the API in project ${projectId}: https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=${projectId}`,
                  projectId,
                  activationUrl: errorData.error?.details?.[0]?.metadata?.activationUrl || `https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=${projectId}`
                },
                { status: 503 }
              )
            }
            
            // Check if it's actually a permission issue or API key issue
            if (
              errorMessage.includes('API key not valid') ||
              errorMessage.includes('API_KEY_INVALID') ||
              (errorMessage.includes('API key') && !errorMessage.includes('SERVICE_DISABLED'))
            ) {
              return NextResponse.json(
                { error: 'Google API key is not configured correctly. Please contact support.' },
                { status: 500 }
              )
            }
            
            // Check for quota exceeded
            if (
              errorMessage.includes('quota') ||
              errorMessage.includes('QUOTA_EXCEEDED') ||
              errorMessage.includes('rateLimitExceeded')
            ) {
              return NextResponse.json(
                { error: 'Google Sheets API quota exceeded. Please try again later.' },
                { status: 429 }
              )
            }
            
            // Only show permission error if it's explicitly about sheet permissions (not API permissions)
            if (
              (errorMessage.includes('PERMISSION_DENIED') && 
               !errorMessage.includes('SERVICE_DISABLED') &&
               !errorMessage.includes('has not been used')) ||
              (errorMessage.includes('permission') && 
               !errorMessage.includes('API') &&
               !errorMessage.includes('SERVICE_DISABLED'))
            ) {
              return NextResponse.json(
                { error: 'Sheet is not publicly accessible. Please set sharing to "Anyone with the link can view" in Google Sheets sharing settings.' },
                { status: 403 }
              )
            }
            
            // Generic 403 - provide more helpful message
            return NextResponse.json(
              { error: `Access denied: ${errorMessage}. This might be due to API configuration or sheet permissions.` },
              { status: 403 }
            )
          }
          
          // Handle 404 - sheet not found
          if (response.status === 404 || errorCode === 404) {
            return NextResponse.json(
              { error: 'Sheet not found. Please check the URL and ensure the sheet exists.' },
              { status: 404 }
            )
          }
          
          // Handle 400 - bad request (invalid spreadsheet ID, etc.)
          if (response.status === 400 || errorCode === 400) {
            return NextResponse.json(
              { error: `Invalid request: ${errorMessage}. Please check the spreadsheet URL.` },
              { status: 400 }
            )
          }
          
          // Generic error
          return NextResponse.json(
            { error: errorMessage || 'Failed to fetch sheet data' },
            { status: response.status }
          )
        }

        const data = await response.json()
        return NextResponse.json({
          values: data.values || [],
          spreadsheetId,
        })
      }

      case 'getMetadata': {
        if (!spreadsheetId) {
          return NextResponse.json(
            { error: 'Spreadsheet ID required' },
            { status: 400 }
          )
        }

        // Get spreadsheet metadata (public access)
        const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_API_KEY}`
        
        const response = await fetch(metadataUrl, {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          // Don't fail metadata fetch, just return empty title
          return NextResponse.json({
            title: null,
            sheets: [],
          })
        }

        const data = await response.json()
        return NextResponse.json({
          title: data.properties?.title || null,
          sheets: data.sheets?.map((sheet: { properties?: { title?: string; sheetId?: number } }) => ({
            title: sheet.properties?.title,
            sheetId: sheet.properties?.sheetId,
          })) || [],
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'googleSheetsAPI',
      action: body?.action,
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

