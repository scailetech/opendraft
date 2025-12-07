import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  // DEV MODE: Skip authentication for UI development
  if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
    console.log('[DEV MODE] Authentication bypassed')
    return NextResponse.next({
      request,
    })
  }

  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({
      request,
    })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  // This refreshes the auth session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicPaths = [
    '/',           // Landing page
    '/auth',       // Auth pages
    '/prototype',  // Prototype pages
  ]
  
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )

  // Redirect to login if no user and trying to access protected route
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    // Preserve the original URL to return to after login
    const returnUrl = request.nextUrl.pathname + request.nextUrl.search
    url.pathname = '/auth'
    url.searchParams.set('returnUrl', returnUrl)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

