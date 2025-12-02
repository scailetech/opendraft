import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateReferralCode } from '@/lib/utils/referral';
import { validateEmail, validateThesisTopic, validateFullName, getClientIP } from '@/lib/utils/validation';
import { replaceEmailPlaceholders } from '@/lib/utils/email';
import { WAITLIST_CONFIG } from '@/lib/config/waitlist';
import { Resend } from 'resend';
import crypto from 'crypto';

// Lazy initialization - only create when needed
let resend: Resend | null = null;
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Verify Cloudflare Turnstile token
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  // Skip verification if Turnstile is not configured
  if (!process.env.TURNSTILE_SECRET_KEY) {
    return true; // Allow signup without Turnstile if not configured
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    return false;
  }
}

// Check rate limit (3 signups per IP per day)
async function checkRateLimit(ip: string): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from('waitlist')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', oneDayAgo);

  return (count || 0) < WAITLIST_CONFIG.SIGNUPS_PER_IP_PER_DAY;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fullName, thesisTopic, language, academicLevel, turnstileToken, referredByCode } = body;

    // Get client IP
    const ip = getClientIP(request.headers);

    // 1. Verify Turnstile
    const turnstileValid = await verifyTurnstile(turnstileToken, ip);
    if (!turnstileValid) {
      return NextResponse.json({ error: 'Spam verification failed' }, { status: 400 });
    }

    // 2. Check rate limit
    const rateLimitOk = await checkRateLimit(ip);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many signups from this IP. Try again in 24 hours.' },
        { status: 429 }
      );
    }

    // 3. Validate inputs
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 });
    }

    const nameValidation = validateFullName(fullName);
    if (!nameValidation.isValid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    const topicValidation = validateThesisTopic(thesisTopic);
    if (!topicValidation.isValid) {
      return NextResponse.json({ error: topicValidation.error }, { status: 400 });
    }

    // 4. Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // 5. Generate tokens
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const referralCode = generateReferralCode();

    // 6. Get current max position
    const { data: maxPosData } = await supabaseAdmin
      .from('waitlist')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = (maxPosData?.position || 0) + 1;

    // 7. Insert into database
    const { data: user, error } = await supabaseAdmin
      .from('waitlist')
      .insert({
        email,
        full_name: fullName,
        thesis_topic: thesisTopic,
        language,
        academic_level: academicLevel,
        position,
        original_position: position,
        referral_code: referralCode,
        referred_by_code: referredByCode || null,
        verification_token: verificationToken,
        verification_token_expires_at: tokenExpiresAt.toISOString(),
        ip_address: ip,
        user_agent: request.headers.get('user-agent'),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create waitlist entry' }, { status: 500 });
    }

    // 8. Send verification email (if Resend is configured)
    const verificationUrl = `${request.nextUrl.origin}/waitlist/verify?token=${verificationToken}`;

    try {
      const resendClient = getResend();
      if (resendClient) {
        const { VerificationEmail } = await import('@/emails/VerificationEmail');
        const { render } = await import('@react-email/render');

        const renderedHtml = await render(
          VerificationEmail({
            fullName,
            verificationUrl,
            position,
            referralCode,
          })
        );

        await resendClient.emails.send({
          from: WAITLIST_CONFIG.FROM_EMAIL,
          reply_to: WAITLIST_CONFIG.REPLY_TO_EMAIL,
          to: email,
          subject: 'Verify your OpenDraft waitlist spot',
          html: replaceEmailPlaceholders(renderedHtml, email),
        });
      }
    } catch (emailError) {
      // Don't fail the signup if email fails - user can resend later
    }

    return NextResponse.json({
      success: true,
      position,
      referralCode,
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
