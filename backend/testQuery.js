import { supabase } from './src/config/supabase.js';

async function testQuery() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, users(email, customers(company_name, shipping_address)), deliveries(id, status, expected_delivery_time, employee_id, vehicle_id, pickup_location, destination, users(full_name), vehicles(vehicle_number))')
    .limit(1);
    
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS, got data');
  }
}
testQuery();
