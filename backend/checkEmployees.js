import { supabase } from './src/config/supabase.js';

async function checkEmployees() {
  const { data, error } = await supabase.from('employees').select('*');
  if (error) {
    console.error('Error fetching employees:', error.message);
  } else {
    console.log('Employees:', data);
  }
}
checkEmployees();
