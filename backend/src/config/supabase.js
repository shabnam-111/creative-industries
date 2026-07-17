// src/config/supabase.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseUrl = process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_PROJECT_URL') {
  console.warn('⚠️ WARNING: SUPABASE_URL is not set or has placeholder value. Please update your backend/.env file.');
  supabaseUrl = 'https://placeholder-url.supabase.co';
}

if (!supabaseKey || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.warn('⚠️ WARNING: SUPABASE_ANON_KEY is not set or has placeholder value. Please update your backend/.env file.');
  supabaseKey = 'placeholder-key';
}

// Create the client
export const supabase = createClient(supabaseUrl, supabaseKey);
