/**
 * ABOUTME: API endpoint to unsubscribe users from emails
 * ABOUTME: Updates the waitlist table to mark user as unsubscribed
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Update user's unsubscribed status
    const { data, error } = await supabaseAdmin
      .from('waitlist')
      .update({
        unsubscribed: true,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('email', email)
      .select('id')
      .single();

    if (error) {
      // If no rows found, user doesn't exist - still return success
      // (don't reveal whether email exists in database)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: true });
      }
      console.error('Unsubscribe error:', error);
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also support GET for one-click unsubscribe (RFC 8058)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.redirect(new URL('/unsubscribe?error=missing_email', request.url));
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.redirect(new URL('/unsubscribe?error=invalid_email', request.url));
  }

  try {
    // Update user's unsubscribed status
    await supabaseAdmin
      .from('waitlist')
      .update({
        unsubscribed: true,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('email', email);

    // Redirect to confirmation page
    return NextResponse.redirect(
      new URL(`/unsubscribe?success=true&email=${encodeURIComponent(email)}`, request.url)
    );
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.redirect(new URL('/unsubscribe?error=failed', request.url));
  }
}
