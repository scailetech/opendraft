import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { WAITLIST_CONFIG } from '@/lib/config/waitlist';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { getClientIP } from '@/lib/utils/validation';
import { replaceEmailPlaceholders } from '@/lib/utils/email';

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
      return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
    }

    // 3. Send welcome email
    try {
      if (process.env.RESEND_API_KEY) {
        const { WelcomeEmail } = await import('@/emails/WelcomeEmail');
        const { render } = await import('@react-email/render');
        const { Resend } = await import('resend');

        const resendClient = new Resend(process.env.RESEND_API_KEY);
        const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/waitlist/${user.id}`;

        // Calculate estimated wait (100 theses/day processing rate)
        const estimatedDays = Math.ceil(user.position / WAITLIST_CONFIG.DAILY_THESIS_LIMIT);
        const estimatedWait = estimatedDays === 1 ? '~1 day' : `~${estimatedDays} days`;

        const welcomeHtml = await render(
          WelcomeEmail({
            fullName: user.full_name,
            position: user.position,
            thesisTopic: user.thesis_topic,
            referralCode: user.referral_code,
            referralCount: 0, // Fresh signup has no referrals yet
            estimatedWait,
            dashboardUrl,
          })
        );

        await resendClient.emails.send({
          from: WAITLIST_CONFIG.FROM_EMAIL,
          reply_to: WAITLIST_CONFIG.REPLY_TO_EMAIL,
          to: user.email,
          subject: 'Welcome to OpenDraft! Your spot is confirmed',
          html: replaceEmailPlaceholders(welcomeHtml, user.email),
        });
      }
    } catch (emailError) {
      // Welcome email failed - continue (don't block verification)
      console.error('Welcome email failed:', emailError);
    }

    // 4. If user was referred, process referral reward
    if (user.referred_by_code) {
      await processReferralReward(user.referred_by_code, user.email);
    }

    // 5. Redirect to success page
    return NextResponse.redirect(new URL(`/waitlist/${user.id}?verified=true`, request.url));
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processReferralReward(referrerCode: string, refereeEmail: string) {
  try {
    // 1. Record the referral (this insert is atomic and prevents duplicate referrals via UNIQUE constraint)
    const { error: referralError } = await supabaseAdmin.from('referrals').insert({
      referrer_code: referrerCode,
      referee_email: refereeEmail,
    });

    if (referralError) {
      // If duplicate referral (UNIQUE constraint violation), silently return
      if (referralError.code === '23505') {
        return;
      }
      return;
    }

    // 2. Get verified referral count for referrer (re-fetch after insert to ensure consistency)
    const { count } = await supabaseAdmin
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_code', referrerCode);

    const referralCount = count || 0;

    // 3. Check if referrer should get reward (every 3 verified referrals)
    // Using modulo check: rewards happen at count 3, 6, 9, 12, etc.
    if (referralCount % WAITLIST_CONFIG.REFERRALS_REQUIRED === 0 && referralCount > 0) {
      // Get referrer user
      const { data: referrer } = await supabaseAdmin
        .from('waitlist')
        .select('*')
        .eq('referral_code', referrerCode)
        .single();

      if (!referrer) return;

      // Only reward if user is still waiting (don't reward if already processing/completed)
      if (referrer.status !== 'waiting') {
        return;
      }

      // Skip 100 positions (but not below 1)
      const newPosition = Math.max(1, referrer.position - WAITLIST_CONFIG.REFERRAL_REWARD);

      // Update position atomically
      const { error: updateError } = await supabaseAdmin
        .from('waitlist')
        .update({ position: newPosition })
        .eq('id', referrer.id)
        .eq('status', 'waiting'); // Double-check status hasn't changed

      if (updateError) {
        return;
      }

      // Mark these specific referrals as rewarded (mark last 3 verified referrals)
      await supabaseAdmin
        .from('referrals')
        .update({ rewarded: true })
        .eq('referrer_code', referrerCode)
        .eq('rewarded', false)
        .limit(WAITLIST_CONFIG.REFERRALS_REQUIRED);

      // Send congratulations email to referrer (if Resend is configured)
      try {
        if (process.env.RESEND_API_KEY) {
          const { ReferralRewardEmail } = await import('@/emails/ReferralRewardEmail');
          const { render } = await import('@react-email/render');
          const { Resend } = await import('resend');

          const resendClient = new Resend(process.env.RESEND_API_KEY);
          const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/waitlist/${referrer.id}`;

          const rewardHtml = await render(
            ReferralRewardEmail({
              fullName: referrer.full_name,
              newPosition,
              oldPosition: referrer.position,
              referralCount,
              dashboardUrl,
              referralCode: referrerCode,
            })
          );

          await resendClient.emails.send({
            from: WAITLIST_CONFIG.FROM_EMAIL,
            reply_to: WAITLIST_CONFIG.REPLY_TO_EMAIL,
            to: referrer.email,
            subject: `You skipped 100 positions! Now at #${newPosition}`,
            html: replaceEmailPlaceholders(rewardHtml, referrer.email),
          });
        }
      } catch (emailError) {
        // Email error - silently continue
      }
    }
  } catch (error) {
    // Referral reward error - silently continue
  }
}
