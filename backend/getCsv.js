import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function getCsvColumns() {
  const url = process.env.SUPABASE_URL + '/rest/v1/deliveries?limit=1';
  const res = await fetch(url, {
    headers: { 
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Accept': 'text/csv'
    }
  });
  const data = await res.text();
  console.log('CSV Headers (all columns):');
  console.log(data.split('\n')[0]);
}
getCsvColumns();
