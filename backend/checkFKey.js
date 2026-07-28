import { supabase } from './src/config/supabase.js';

async function getOrder() {
  const { data } = await supabase.from('orders').select('id').limit(1);
  return data[0].id;
}

async function checkFKey() {
  const orderId = await getOrder();
  
  // Try to insert with employees.id
  let res1 = await supabase.from('deliveries').insert([{
    order_id: orderId,
    employee_id: '2e60a993-f53a-4888-9c6b-c0c238130c79',
    destination: 'test',
    status: 'pending'
  }]);
  console.log('Insert with employees.id:', res1.error?.message || 'Success');

  // Try to insert with employees.user_id
  let res2 = await supabase.from('deliveries').insert([{
    order_id: orderId,
    employee_id: 'e2222222-2222-2222-2222-222222222222',
    destination: 'test',
    status: 'pending'
  }]);
  console.log('Insert with employees.user_id:', res2.error?.message || 'Success');
}
checkFKey();
