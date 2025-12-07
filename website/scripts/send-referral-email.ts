import { Resend } from 'resend';
import { render } from '@react-email/render';
import { ReferralRewardEmail } from '../emails/ReferralRewardEmail';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://opendraft.xyz';

const resend = new Resend(RESEND_API_KEY);

async function sendReferralEmail() {
  const email = process.argv[2] || 'f.deponte@yahoo.de';
  
  console.log(`📧 Sending ReferralRewardEmail to ${email}...`);
  
  const result = await resend.emails.send({
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

  if (result.error) {
    console.error('❌ Error:', result.error.message);
  } else {
    console.log('✅ Sent! Email ID:', result.data?.id);
  }
}

sendReferralEmail().catch(console.error);

