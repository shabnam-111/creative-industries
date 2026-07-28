import { supabase } from './src/config/supabase.js';

async function fetchDeliveries() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*');
  
  if (error) {
    console.error('Fetch error:', error);
  } else {
    console.log('Deliveries:', JSON.stringify(data, null, 2));
  }
}
fetchDeliveries();
