import { supabase } from './src/config/supabase.js';

async function testDeliveryStatus() {
  const { data, error } = await supabase
    .from('deliveries')
    .update({ status: 'dispatched' })
    .not('id', 'is', null)
    .limit(1)
    .select();
  
  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('Update success:', data);
  }
}
testDeliveryStatus();
