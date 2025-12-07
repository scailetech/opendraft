// Test Resend API key and email sending
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const resend = new Resend(RESEND_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testResend() {
  console.log('🔍 Testing Resend API key...\n');

  // Test 1: Check API key validity by trying to send email
  // (domains.list() might not be available in all Resend SDK versions)
  console.log('🔍 Testing API key by attempting email send...');

  // Test 2: Get user and try to send email
  console.log('\n🔍 Fetching user...');
  const { data: user, error: userError } = await supabase
    .from('waitlist')
    .select('*')
    .eq('email', 'f.deponte@yahoo.de')
    .single();

  if (userError || !user) {
    console.error('❌ User not found:', userError);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.full_name} (position #${user.position})\n`);

  // Test 3: Try sending email
  console.log('🔍 Attempting to send test email...');
  try {
    const result = await resend.emails.send({
      from: 'OpenDraft <hello@clients.opendraft.xyz>',
      to: 'f.deponte@yahoo.de',
      subject: 'Test Email - OpenDraft Verification',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify Resend is working.</p>
        <p>Your position: #${user.position}</p>
        <p>Verification URL: <a href="https://opendraft.xyz/waitlist/verify?token=test123">Click here</a></p>
      `,
    });
    
    // Check if result has error (Resend SDK returns { data, error } format)
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
    } else {
      console.log('✅ Email sent successfully!');
      console.log('   Email ID:', result.data?.id);
      console.log('   Result:', JSON.stringify(result, null, 2));
    }
  } catch (error: any) {
    console.error('❌ Exception thrown:');
    console.error('   Error:', error.message);
    console.error('   Full error:', JSON.stringify(error, null, 2));
  }
}

testResend().catch(console.error);

