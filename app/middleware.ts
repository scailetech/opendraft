import { updateSession } from "@/utils/supabase/middleware"
import { type NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  // Skip middleware for webhooks (Modal callbacks, etc.)
  // These endpoints handle their own authentication via webhook secrets
  if (request.nextUrl.pathname.startsWith('/api/webhook/')) {
    return NextResponse.next()
  }

  // Skip middleware for auth callback - it handles its own redirects and session creation
  if (request.nextUrl.pathname === '/auth/callback') {
    return NextResponse.next()
  }

  // Skip middleware for components-showcase (public demo page)
  if (request.nextUrl.pathname === '/components-showcase') {
    return NextResponse.next()
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
  runtime: "nodejs",
}

