import { supabase } from './src/config/supabase.js';

async function checkSchema() {
  const { data, error } = await supabase.from('deliveries').select('*, users(full_name)').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Deliveries Data:', JSON.stringify(data, null, 2));
  }
}
checkSchema();
