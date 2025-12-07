// Script to send all email templates for inspection
// Usage: npx tsx scripts/send-all-emails.ts <email>

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { VerificationEmail } from '../emails/VerificationEmail';
import { CompletionEmail } from '../emails/CompletionEmail';
import { ReferralRewardEmail } from '../emails/ReferralRewardEmail';
import { WelcomeEmail } from '../emails/WelcomeEmail';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://opendraft.xyz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const resend = new Resend(RESEND_API_KEY);

async function sendAllEmails(email: string) {
  console.log(`📧 Sending all email templates to ${email}...\n`);

  // 1. Verification Email
  console.log('1️⃣ Sending VerificationEmail...');
  try {
    const verificationResult = await resend.emails.send({
      from: 'OpenDraft <hello@clients.opendraft.xyz>',
      to: email,
      subject: '[TEST] Verify your OpenDraft waitlist spot',
      html: render(
        VerificationEmail({
          fullName: 'Federico De Ponte',
          verificationUrl: `${BASE_URL}/waitlist/verify?token=test-verification-token-123`,
          position: 42,
          referralCode: 'FEDE42XY',
        })
      ),
    });
    if (verificationResult.error) {
      console.error('   ❌ Error:', verificationResult.error.message);
    } else {
      console.log('   ✅ Sent! Email ID:', verificationResult.data?.id);
    }
  } catch (error: any) {
    console.error('   ❌ Exception:', error.message);
  }

  // 2. Welcome Email
  console.log('\n2️⃣ Sending WelcomeEmail...');
  try {
    const welcomeResult = await resend.emails.send({
      from: 'OpenDraft <hello@clients.opendraft.xyz>',
      to: email,
      subject: '[TEST] Welcome to OpenDraft!',
      html: render(
        WelcomeEmail({
          fullName: 'Federico De Ponte',
          position: 42,
          referralCode: 'FEDE42XY',
          referralUrl: `${BASE_URL}/waitlist/r/FEDE42XY`,
        })
      ),
    });
    if (welcomeResult.error) {
      console.error('   ❌ Error:', welcomeResult.error.message);
    } else {
      console.log('   ✅ Sent! Email ID:', welcomeResult.data?.id);
    }
  } catch (error: any) {
    console.error('   ❌ Exception:', error.message);
  }

  // 3. Referral Reward Email
  console.log('\n3️⃣ Sending ReferralRewardEmail...');
  try {
    const referralResult = await resend.emails.send({
      from: 'OpenDraft <hello@clients.opendraft.xyz>',
      to: email,
      subject: '[TEST] You skipped 20 positions!',
      html: render(
        ReferralRewardEmail({
          fullName: 'Federico De Ponte',
          newPosition: 50,
          oldPosition: 70,
          referralCount: 1,
          dashboardUrl: `${BASE_URL}/waitlist/test-user-id`,
          positionsSkipped: 20,
        })
      ),
    });
    if (referralResult.error) {
      console.error('   ❌ Error:', referralResult.error.message);
    } else {
      console.log('   ✅ Sent! Email ID:', referralResult.data?.id);
    }
  } catch (error: any) {
    console.error('   ❌ Exception:', error.message);
  }

  // 4. Completion Email
  console.log('\n4️⃣ Sending CompletionEmail...');
  try {
    const completionResult = await resend.emails.send({
      from: 'OpenDraft <hello@clients.opendraft.xyz>',
      to: email,
      subject: '[TEST] Your AI-Generated Thesis is Ready!',
      html: render(
        CompletionEmail({
          fullName: 'Federico De Ponte',
          pdfUrl: `${BASE_URL}/download/thesis.pdf?token=test-pdf-token`,
          docxUrl: `${BASE_URL}/download/thesis.docx?token=test-docx-token`,
          zipUrl: `${BASE_URL}/download/thesis_package.zip?token=test-zip-token`,
        })
      ),
    });
    if (completionResult.error) {
      console.error('   ❌ Error:', completionResult.error.message);
    } else {
      console.log('   ✅ Sent! Email ID:', completionResult.data?.id);
    }
  } catch (error: any) {
    console.error('   ❌ Exception:', error.message);
  }

  console.log('\n✅ All emails sent! Check your inbox.');
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/send-all-emails.ts <email>');
  process.exit(1);
}

sendAllEmails(email).catch(console.error);

