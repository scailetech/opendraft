// Script to update waitlist position
// Usage: npx tsx scripts/update-position.ts f.deponte@yahoo.de 1

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updatePosition(email: string, newPosition: number) {
  // Get current user
  const { data: user, error: fetchError } = await supabase
    .from('waitlist')
    .select('*')
    .eq('email', email)
    .single();

  if (fetchError || !user) {
    console.error('User not found:', fetchError);
    return;
  }

  const oldPosition = user.position;

  // Update position
  const { error: updateError } = await supabase
    .from('waitlist')
    .update({ position: newPosition })
    .eq('id', user.id);

  if (updateError) {
    console.error('Failed to update position:', updateError);
    return;
  }

  console.log(`✅ Updated ${email}`);
  console.log(`   Position: #${oldPosition} → #${newPosition}`);
  console.log(`   Status: ${user.status}`);
  console.log(`   Email verified: ${user.email_verified}`);
}

const email = process.argv[2];
const position = parseInt(process.argv[3]);

if (!email || !position) {
  console.error('Usage: npx tsx scripts/update-position.ts <email> <position>');
  process.exit(1);
}

updatePosition(email, position).catch(console.error);

