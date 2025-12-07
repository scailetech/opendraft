const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rnuiiqgkytwmztgsanng.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_hI42whqNsWRQIgRzkcSmag_FRbIWlqh';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updatePosition() {
  const email = 'f.deponte@yahoo.de';
  const newPosition = 1;

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

  console.log(`Current position: #${user.position}`);

  // Update position
  const { data, error } = await supabase
    .from('waitlist')
    .update({ position: newPosition })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update:', error);
    return;
  }

  console.log(`✅ Updated ${email} to position #${data.position}`);
  console.log(`   Status: ${data.status}`);
  console.log(`   Email verified: ${data.email_verified}`);
}

updatePosition().catch(console.error);

