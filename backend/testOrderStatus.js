import { supabase } from './src/config/supabase.js';

async function testOrderStatus() {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'dispatched' })
    .eq('order_number', 'ORD-328644')
    .select();
  
  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('Update success:', data);
  }
}
testOrderStatus();
