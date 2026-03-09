import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase.from('_non_existent_table_just_to_test_auth').select('*').limit(1);
  if (error) {
    // If it's a "relation does not exist" error, the connection and auth are actually working!
    if (error.code === '42P01') {
      console.log("Connection successful! Authenticated with Supabase correctly (table not found, which is expected).");
    } else {
      console.error("Connection error:", error);
    }
  } else {
    console.log("Connection successful!");
  }
}

testConnection();
