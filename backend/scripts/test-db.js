// scripts/test-db.js
import { supabase } from '../src/config/supabase.js';

async function checkTables() {
  console.log('Testing Supabase Connection & Checking Tables...');
  
  // Try querying users
  const { data: users, error: usersError } = await supabase.from('users').select('*').limit(1);
  if (usersError) {
    console.error('❌ Error reading "users" table:', usersError.message);
  } else {
    console.log('✅ "users" table exists and is accessible. Count:', users.length);
  }

  // Try querying products
  const { data: products, error: productsError } = await supabase.from('products').select('*').limit(1);
  if (productsError) {
    console.error('❌ Error reading "products" table:', productsError.message);
  } else {
    console.log('✅ "products" table exists and is accessible. Count:', products.length);
  }

  // Try querying orders
  const { data: orders, error: ordersError } = await supabase.from('orders').select('*').limit(1);
  if (ordersError) {
    console.error('❌ Error reading "orders" table:', ordersError.message);
  } else {
    console.log('✅ "orders" table exists and is accessible. Count:', orders.length);
  }

  // Check login_logs, activity_logs, vehicles, deliveries, employee_gps_logs
  const tables = ['login_logs', 'activity_logs', 'vehicles', 'deliveries', 'employee_gps_logs', 'notifications', 'order_items', 'audit_logs'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table "${table}" does not exist or has error:`, error.message);
    } else {
      console.log(`✅ Table "${table}" exists.`);
    }
  }

  process.exit(0);
}

checkTables();
