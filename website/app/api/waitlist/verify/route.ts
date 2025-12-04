import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { WAITLIST_CONFIG } from '@/lib/config/waitlist';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { getClientIP } from '@/lib/utils/validation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing verification token' }, { status: 400 });
    }

    // Rate limiting: 10 verification attempts per IP per hour
    const ip = getClientIP(request.headers);
    const rateLimitResult = checkRateLimit(`verify:${ip}`, { maxAttempts: 10, windowMs: 60 * 60 * 1000 });

    if (!rateLimitResult.success) {
      const resetInMinutes = Math.ceil((rateLimitResult.resetAt - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Too many verification attempts. Try again in ${resetInMinutes} minutes.` },
        { status: 429 }
      );
    }

    // 1. Find user by verification token
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .eq('verification_token', token)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }

    // Check if token has expired
    if (user.verification_token_expires_at && new Date(user.verification_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Verification token has expired. Please sign up again.' }, { status: 400 });
    }

    if (user.email_verified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
    }

    // 2. Update user as verified
    const { error: updateError } = await supabaseAdmin
      .from('waitlist')
      .update({
        email_verified: true,
        verified_at: new Date().toISOString(),
        verification_token: null, // Clear token for security
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Verification update error:', updateError);
      return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
    }

    // 3. If user was referred, process referral reward
    if (user.referred_by_code) {
      await processReferralReward(user.referred_by_code, user.email);
    }

    // 4. Redirect to success page
    return NextResponse.redirect(new URL(`/waitlist/${user.id}?verified=true`, request.url));
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processReferralReward(referrerCode: string, refereeEmail: string) {
  try {
    // 1. Record the referral
    const { error: referralError } = await supabaseAdmin.from('referrals').insert({
      referrer_code: referrerCode,
      referee_email: refereeEmail,
    });

    if (referralError) {
      // If duplicate referral (UNIQUE constraint violation), silently return
      if (referralError.code === '23505') {
        console.log('Duplicate referral ignored:', refereeEmail);
        return;
      }
      console.error('Referral insert error:', referralError);
      return;
    }

    // 2. Get referrer user
    const { data: referrer } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .eq('referral_code', referrerCode)
      .single();

    if (!referrer) return;

    // Only reward if user is still waiting
    if (referrer.status !== 'waiting') {
      console.log(`Referrer ${referrer.email} is ${referrer.status}, skipping reward`);
      return;
    }

    // 3. Each referral = 20 positions skipped (but not below 1)
    const positionsToSkip = WAITLIST_CONFIG.REFERRAL_REWARD; // 20
    const newPosition = Math.max(1, referrer.position - positionsToSkip);

    // Update position
    const { error: updateError } = await supabaseAdmin
      .from('waitlist')
      .update({ position: newPosition })
      .eq('id', referrer.id)
      .eq('status', 'waiting');

    if (updateError) {
      console.error('Failed to update referrer position:', updateError);
      return;
    }

    // Mark referral as rewarded
    await supabaseAdmin
      .from('referrals')
      .update({ rewarded: true })
      .eq('referrer_code', referrerCode)
      .eq('referee_email', refereeEmail);

    // Get updated referral count
    const { count } = await supabaseAdmin
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_code', referrerCode);

    const referralCount = count || 1;

    // Send congratulations email to referrer
    try {
      const { ReferralRewardEmail } = await import('@/emails/ReferralRewardEmail');
      const { render } = await import('@react-email/render');
      const { Resend } = await import('resend');

      const resendClient = new Resend(process.env.RESEND_API_KEY);
      const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/waitlist/${referrer.id}`;

      await resendClient.emails.send({
        from: WAITLIST_CONFIG.FROM_EMAIL,
        to: referrer.email,
        subject: `You skipped ${positionsToSkip} positions! Now at #${newPosition}`,
        html: render(
          ReferralRewardEmail({
            fullName: referrer.full_name,
            newPosition,
            oldPosition: referrer.position,
            referralCount,
            dashboardUrl,
            positionsSkipped: positionsToSkip,
          })
        ),
      });
    } catch (emailError) {
      console.error('Failed to send referral reward email:', emailError);
    }

    console.log(`Referral reward: ${referrer.email} skipped ${positionsToSkip} positions to #${newPosition}`);
  } catch (error) {
    console.error('Process referral reward error:', error);
  }
}
