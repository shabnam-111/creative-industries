import { supabase } from './src/config/supabase.js';
import fetch from 'node-fetch'; // Just use raw sql query if possible

async function inspectFKeys() {
  const { data, error } = await supabase
    .rpc('get_foreign_keys'); // Might not exist
  console.log(data, error);
}
inspectFKeys();
