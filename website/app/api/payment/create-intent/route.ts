import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { WAITLIST_CONFIG } from '@/lib/config/waitlist';
import { validateEmail, validateThesisTopic, validateFullName, getClientIP } from '@/lib/utils/validation';
import { generateReferralCode } from '@/lib/utils/referral';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Verify Cloudflare Turnstile token
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
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
    console.error('Turnstile verification error:', error);
    return false;
  }
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

    // 2. Validate inputs
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

    // 3. Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('waitlist')
      .select('id, payment_status')
      .eq('email', email)
      .single();

    if (existingUser) {
      // If user already paid, return error
      if (existingUser.payment_status === 'paid') {
        return NextResponse.json({ error: 'Email already registered with paid access' }, { status: 400 });
      }
      // If user exists but hasn't paid, allow payment
    }

    // 4. Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(WAITLIST_CONFIG.IMMEDIATE_PAYMENT_AMOUNT * 100), // Convert to cents
      currency: WAITLIST_CONFIG.IMMEDIATE_PAYMENT_CURRENCY.toLowerCase(),
      metadata: {
        email,
        fullName,
        thesisTopic,
        language,
        academicLevel,
        referredByCode: referredByCode || '',
        ip,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // 5. Create waitlist entry with payment_mode = 'immediate' and payment_status = 'pending'
    // Get current max position (for reference, but immediate users skip queue)
    const { data: maxPosData } = await supabaseAdmin
      .from('waitlist')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = (maxPosData?.position || 0) + 1;

    // Generate referral code for user
    const referralCode = generateReferralCode();

    // Insert or update user
    const { data: user, error: dbError } = await supabaseAdmin
      .from('waitlist')
      .upsert(
        {
          email,
          full_name: fullName,
          thesis_topic: thesisTopic,
          language,
          academic_level: academicLevel,
          position,
          original_position: position,
          referral_code: referralCode,
          payment_mode: WAITLIST_CONFIG.PAYMENT_MODES.IMMEDIATE,
          payment_status: WAITLIST_CONFIG.PAYMENT_STATUS.PENDING,
          payment_amount: WAITLIST_CONFIG.IMMEDIATE_PAYMENT_AMOUNT,
          payment_currency: WAITLIST_CONFIG.IMMEDIATE_PAYMENT_CURRENCY,
          stripe_payment_intent_id: paymentIntent.id,
          referred_by_code: referredByCode || null,
          ip_address: ip,
          user_agent: request.headers.get('user-agent'),
          // For immediate payment, mark as verified and ready to process
          email_verified: true,
          status: 'waiting',
        },
        {
          onConflict: 'email',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to create payment entry' }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      userId: user.id,
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

