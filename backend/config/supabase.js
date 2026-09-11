import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!process.env.SUPABASE_URL || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_PUBLISHABLE_KEY)"
  );
}
  
const supabase = createClient(process.env.SUPABASE_URL, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export default supabase;