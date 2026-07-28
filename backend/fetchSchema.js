import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function getOpenAPI() {
  const url = process.env.SUPABASE_URL + '/rest/v1/';
  const res = await fetch(url, {
    headers: { 'apikey': process.env.SUPABASE_ANON_KEY }
  });
  const data = await res.json();
  fs.writeFileSync('openapi.json', JSON.stringify(data, null, 2));
}
getOpenAPI();
