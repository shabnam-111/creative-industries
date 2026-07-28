import { supabase } from './src/config/supabase.js';

async function describeTable() {
  const { data, error } = await supabase
    .rpc('get_deliveries_schema'); // if such RPC exists, but probably not.

  // Supabase Rest API way to get columns without RPC:
  // Since we might not have RPC, we can just do a select with limit 0 and check the keys, 
  // or use the rest API directly via node-fetch on /rest/v1/?select=...
}

async function getKeys() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in deliveries table (based on row keys):');
    console.log(Object.keys(data[0]));
  } else {
    console.log('No data found, cannot infer columns from data.');
  }
}
getKeys();
