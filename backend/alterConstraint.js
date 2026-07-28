import { supabase } from './src/config/supabase.js';

async function updateConstraint() {
  const { data, error } = await supabase.rpc('run_sql', {
    query: `
      ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
      ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'dispatched', 'delivered', 'cancelled', 'processing', 'completed'));
    `
  });
  console.log(data, error);
}
updateConstraint();
