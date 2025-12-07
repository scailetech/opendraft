/**
 * ABOUTME: Google OAuth utility for Google Sheets export
 * ABOUTME: Uses Google OAuth popup flow to get access token for Sheets API
 */

'use client'

import { logError } from '@/lib/errors'

// Support both naming conventions for flexibility
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 
                         process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || 
                         ''

// Scopes needed for Google Sheets integration
// drive.readonly: Read-only access to list/search user's files (needed for file picker/search)
// drive.file: Create and access files created by the app (needed for creating new sheets)
// Note: Using space-separated scopes - Google OAuth supports multiple scopes
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file'

interface GoogleAuthResult {
  accessToken: string
  expiresIn: number
}

/**
 * Get Google OAuth access token via popup flow
 * Returns access token that can be used for Google Sheets API
 * Uses Google Identity Services (newer OAuth 2.0 API)
 */
export async function getGoogleAccessToken(): Promise<GoogleAuthResult> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable.')
  }

  if (typeof window === 'undefined') {
    throw new Error('Not in browser environment')
  }

  // Load Google Identity Services script if not already loaded
  const loadGoogleScript = (): Promise<void> => {
    return new Promise((resolveScript, rejectScript) => {
      if (window.google?.accounts?.oauth2) {
        resolveScript()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        // Wait a bit for the script to initialize
        setTimeout(() => {
          if (window.google?.accounts?.oauth2) {
            resolveScript()
          } else {
            rejectScript(new Error('Google Identity Services not initialized'))
          }
        }, 100)
      }
      script.onerror = () => {
        rejectScript(new Error('Failed to load Google Identity Services'))
      }
      document.head.appendChild(script)
    })
  }

  try {
    await loadGoogleScript()
  } catch (scriptError) {
    throw scriptError
  }

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services not available')
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    let callbackFired = false
    let timeoutId: NodeJS.Timeout | null = null

    // Use Google Identity Services token client - matching test file pattern exactly
    // Listen for postMessage events (Google Identity Services might use this)
    const messageHandler = () => {
      // Silent handler - no logging needed
    }
    window.addEventListener('message', messageHandler)
    
    // Clean up message listener when callback fires or timeout
    const cleanup = () => {
      window.removeEventListener('message', messageHandler)
      if (typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>).__googleOAuthCallback
      }
    }
    
    // Define callback FIRST (before creating tokenClient) - matching test file pattern
    const oauthCallback = (response: { access_token?: string; error?: string; error_description?: string; expires_in?: number }) => {
      callbackFired = true
      if (timeoutId) clearTimeout(timeoutId)
      cleanup()

      if (response.error) {
        let errorMessage = response.error
        if (response.error === 'redirect_uri_mismatch') {
          errorMessage = `OAuth configuration error: redirect_uri_mismatch. Current origin: ${window.location.origin}. Please check GOOGLE_OAUTH_SETUP.md and ensure ${window.location.origin} is in Authorized JavaScript origins.`
        } else if (response.error === 'access_denied') {
          errorMessage = 'Access denied. Check OAuth consent screen configuration in Google Cloud Console. Ensure app is published (not in Testing mode).'
        } else if (response.error_description) {
          errorMessage = `${response.error}: ${response.error_description}`
        }
        reject(new Error(errorMessage))
        return
      }
      
      if (response.access_token) {
        resolve({
          accessToken: response.access_token,
          expiresIn: response.expires_in || 3600,
        })
      } else {
        reject(new Error('No access token received in callback response'))
      }
    }
    
    // Store callback reference globally (in case it gets lost)
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__googleOAuthCallback = oauthCallback
    }
    
    // Set up timeout with cleanup
    timeoutId = setTimeout(() => {
      if (!callbackFired) {
        cleanup()
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        reject(new Error(`OAuth timeout after ${elapsed}s. The popup may have been blocked, closed prematurely, or there may be an OAuth configuration issue.`))
      }
    }, 60000)
    
    try {
      // Create token client with callback - matching test file pattern exactly
      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: oauthCallback,
      })

      // Request access token - matching test file pattern exactly
      try {
        tokenClient.requestAccessToken({ prompt: 'consent' })
      } catch (requestError) {
        if (timeoutId) clearTimeout(timeoutId)
        throw requestError
      }
      
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)
      logError(err instanceof Error ? err : new Error(String(err)), {
        source: 'getGoogleAccessToken',
        context: 'Google OAuth',
      })
      reject(err)
    }
  })
}

/**
 * Check if user has valid Google access token stored
 */
export function getStoredGoogleToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem('google_access_token')
  } catch {
    return null
  }
}

/**
 * Store Google access token temporarily
 */
export function storeGoogleToken(token: string, expiresIn: number): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem('google_access_token', token)
    // Store expiration time (in milliseconds)
    const expiresAt = Date.now() + expiresIn * 1000
    sessionStorage.setItem('google_token_expires_at', expiresAt.toString())
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if stored token is still valid
 */
export function isGoogleTokenValid(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const expiresAt = sessionStorage.getItem('google_token_expires_at')
    if (!expiresAt) return false
    return Date.now() < parseInt(expiresAt, 10)
  } catch {
    return false
  }
}

/**
 * Clear stored Google token
 */
export function clearGoogleToken(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem('google_access_token')
    sessionStorage.removeItem('google_token_expires_at')
  } catch {
    // Ignore storage errors
  }
}

// Extend Window interface for Google Identity Services and Picker API
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string; expires_in?: number }) => void
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void
          }
        }
      }
      picker?: {
        PickerBuilder: new () => {
          setOAuthToken: (token: string) => unknown
          addView: (view: unknown) => unknown
          setCallback: (callback: (data: unknown) => void) => unknown
          build: () => { setVisible: (visible: boolean) => void }
        }
        ViewId: {
          SPREADSHEETS: string
        }
        Response: {
          ACTION: string
          DOCUMENTS: string
        }
        Action: {
          PICKED: string
          LOADED: string
          CANCEL: string
        }
      }
    }
  }
}

