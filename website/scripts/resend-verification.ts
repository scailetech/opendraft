// Script to resend verification email for a waitlist user
// Usage: npx tsx scripts/resend-verification.ts fede@scaile.tech

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { VerificationEmail } from '../emails/VerificationEmail';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://opendraft.xyz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const resend = new Resend(RESEND_API_KEY);

async function resendVerificationEmail(email: string) {
  // 1. Find user
  const { data: user, error } = await supabase
    .from('waitlist')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    console.error('User not found:', error);
    return;
  }

  if (user.email_verified) {
    console.log('Email already verified!');
    return;
  }

  // 2. Generate new token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // 3. Update user with new token
  const { error: updateError } = await supabase
    .from('waitlist')
    .update({
      verification_token: verificationToken,
      verification_token_expires_at: tokenExpiresAt.toISOString(),
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Failed to update token:', updateError);
    return;
  }

  // 4. Send email
  const verificationUrl = `${BASE_URL}/waitlist/verify?token=${verificationToken}`;

  try {
    const result = await resend.emails.send({
      from: 'OpenDraft <hello@clients.opendraft.xyz>',
      to: email,
      subject: 'Verify your OpenDraft waitlist spot',
      html: render(
        VerificationEmail({
          fullName: user.full_name,
          verificationUrl,
          position: user.position,
          referralCode: user.referral_code,
        })
      ),
    });

    // Check if Resend SDK returned an error in the result object
    if (result.error) {
      console.error('❌ Failed to send email:');
      console.error('   Error:', result.error.message);
      console.error('   Status:', result.error.statusCode);
      console.error('   Full error:', JSON.stringify(result.error, null, 2));
      
      if (result.error.message?.includes('domain') || result.error.message?.includes('Domain')) {
        console.error('\n💡 Possible issue: Domain not verified in Resend');
        console.error('   Check: https://resend.com/domains');
        console.error('   Domain should be: clients.opendraft.xyz');
      }
      return;
    }

    console.log(`✅ Verification email sent to ${email}`);
    console.log(`   Position: #${user.position}`);
    console.log(`   Email ID: ${result.data?.id || 'N/A'}`);
    console.log(`   Verification URL: ${verificationUrl}`);
  } catch (emailError: any) {
    console.error('❌ Exception thrown while sending email:');
    console.error('   Error:', emailError.message);
    console.error('   Full error:', JSON.stringify(emailError, null, 2));
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/resend-verification.ts <email>');
  process.exit(1);
}

resendVerificationEmail(email).catch(console.error);

