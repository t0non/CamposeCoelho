const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://szntzeclwouyidfossrk.supabase.co',
  'sb_publishable__8fluEp5frSCj8e6L4Ey7A_yD38juUJ'
);

async function test() {
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@camposecoelho.com.br',
    password: 'Admin@2026!'
  });
  
  if (authError) {
    console.error('Auth Error:', authError.message);
    return;
  }
  
  console.log('User ID:', auth.user.id);
  
  const { data, error } = await supabase.from('profiles').select('*').eq('id', auth.user.id).single();
  
  console.log('Profile Error:', error?.message);
  console.log('Profile Data:', data);
}

test();
