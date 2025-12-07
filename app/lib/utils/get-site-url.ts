// ABOUTME: Utility function to get the correct site URL for authentication redirects
// ABOUTME: Handles localhost, Vercel deployments, and custom domains properly
// ABOUTME: Follows zola-aisdkv5 pattern for consistency

const DEFAULT_LOCAL_URL = 'http://localhost:3000'

type GetSiteUrlOptions = {
  /**
   * Optional origin detected from the incoming request - used for server-side auth flows.
   */
  requestOrigin?: string | null
  /**
   * When false, the request origin will be ignored even if provided.
   */
  allowOriginFallback?: boolean
}

const ensureScheme = (value: string): string => {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }
  return `https://${value}`
}

const toOrigin = (value: string): string | null => {
  try {
    const url = new URL(ensureScheme(value))
    return url.origin
  } catch {
    return null
  }
}

const toAllowedHosts = (): Set<string> => {
  const raw = process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_HOSTS
  if (!raw) return new Set()

  return new Set(
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        try {
          return new URL(ensureScheme(item)).host
        } catch {
          return item
        }
      })
  )
}

const isLocalHost = (host: string) =>
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host === '[::1]' ||
  host.endsWith('.localhost')

const isAllowedFallbackOrigin = (
  origin: string,
  explicitOrigin: string | null,
  allowedHosts: Set<string>,
  vercelHost: string | null
): boolean => {
  try {
    const parsed = new URL(origin)
    const host = parsed.host

    if (explicitOrigin) {
      const explicitHost = new URL(explicitOrigin).host
      if (host === explicitHost) return true
    }

    if (vercelHost && host === vercelHost) return true
    if (allowedHosts.has(host)) return true
    // Allow production domain
    if (host === 'bulk.run' || host === 'www.bulk.run') return true
    if (host.endsWith('.vercel.app')) return true
    if (host.endsWith('.onrender.com')) return true
    if (isLocalHost(host)) return true

    return false
  } catch {
    return false
  }
}

/**
 * Gets the correct site URL based on the current environment.
 *
 * Priority order (DEVELOPMENT):
 * 1. window.location.origin (client-side, works with any localhost port)
 * 2. requestOrigin (validated) on the server
 * 3. Localhost for development
 *
 * Priority order (PRODUCTION):
 * 1. NEXT_PUBLIC_SITE_URL (if explicitly set)
 * 2. VERCEL_URL (for Vercel deployments)
 * 3. requestOrigin (validated) on the server
 * 4. window.location.origin (client-side fallback)
 */
export function getSiteUrl(options: GetSiteUrlOptions = {}): string {
  const { requestOrigin, allowOriginFallback = true } = options
  const isDevelopment = process.env.NODE_ENV === 'development'

  // IN DEVELOPMENT: Prioritize actual window.location.origin (works with any port)
  // This allows development to work on any localhost port without reconfiguring Supabase
  if (isDevelopment && typeof window !== 'undefined') {
    return window.location.origin
  }

  // IN DEVELOPMENT (server-side): Use requestOrigin if available
  if (isDevelopment && requestOrigin && isLocalHost(new URL(requestOrigin).host)) {
    return requestOrigin
  }

  const explicitOrigin = process.env.NEXT_PUBLIC_SITE_URL
    ? toOrigin(process.env.NEXT_PUBLIC_SITE_URL)
    : null

  const vercelHost = process.env.VERCEL_URL ?? null
  const vercelOrigin = vercelHost ? toOrigin(vercelHost) : null

  // Support Render deployments
  const renderHost = process.env.RENDER_EXTERNAL_URL ?? null
  const renderOrigin = renderHost ? toOrigin(renderHost) : null
  const allowedHosts = toAllowedHosts()

  if (explicitOrigin) {
    try {
      allowedHosts.add(new URL(explicitOrigin).host)
    } catch {
      // noop
    }
  }
  if (vercelHost) {
    allowedHosts.add(vercelHost)
  }
  if (renderHost) {
    try {
      allowedHosts.add(new URL(renderHost).host)
    } catch {
      // noop
    }
  }

  // Check if requestOrigin is bulk.run (production domain)
  if (requestOrigin) {
    try {
      const requestHost = new URL(requestOrigin).host
      if (requestHost === 'bulk.run' || requestHost === 'www.bulk.run') {
        return requestOrigin
      }
    } catch {
      // Invalid URL, continue with other checks
    }
  }

  if (
    allowOriginFallback &&
    requestOrigin &&
    isAllowedFallbackOrigin(requestOrigin, explicitOrigin, allowedHosts, vercelHost)
  ) {
    return requestOrigin
  }

  if (explicitOrigin) {
    return explicitOrigin
  }

  if (vercelOrigin) {
    return vercelOrigin
  }

  if (renderOrigin) {
    return renderOrigin
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return DEFAULT_LOCAL_URL
}

type GetAuthCallbackUrlOptions = GetSiteUrlOptions & {
  path?: string
}

/**
 * Gets the auth callback URL for OAuth redirects.
 */
export function getAuthCallbackUrl(
  options: GetAuthCallbackUrlOptions = {}
): string {
  const base = getSiteUrl(options)
  const path = options.path ?? '/auth/callback'
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

