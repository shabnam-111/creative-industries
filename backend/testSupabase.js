import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
    const { data, error } = await supabase
      .from('orders')
      .select('*, deliveries(status, expected_delivery_time, users(full_name), vehicles(vehicle_number))')
      .limit(1);
    console.log(JSON.stringify(data, null, 2));
    if (error) console.log(error);
}
test();
