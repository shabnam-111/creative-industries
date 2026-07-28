import { supabase } from './src/config/supabase.js';

async function checkOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, deliveries(status)');
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Orders:', JSON.stringify(data, null, 2));
  }
}
checkOrders();
