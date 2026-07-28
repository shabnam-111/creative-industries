import { supabase } from './src/config/supabase.js';

async function testStatus() {
  const statusesToTest = ['assigned', 'pending', 'started'];
  
  for (const status of statusesToTest) {
    const { data, error } = await supabase.from('deliveries').insert([{
      order_id: '00000000-0000-0000-0000-000000000000',
      employee_id: '00000000-0000-0000-0000-000000000000',
      destination: 'test',
      status: status
    }]);
    if (error) {
      console.log(`Status '${status}' failed with:`, error.message);
    } else {
      console.log(`Status '${status}' succeeded!`);
    }
  }
}
testStatus();
