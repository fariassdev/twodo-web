import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Hardcoded profile IDs (no auth yet)
export const BUBI_ID = 'a1111111-1111-1111-1111-111111111111';
export const SOFIA_ID = 'b2222222-2222-2222-2222-222222222222';
export const CURRENT_USER_ID = BUBI_ID;
