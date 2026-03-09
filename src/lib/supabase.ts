/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Hardcoded profile IDs (no auth yet)
export const MAIN_ID = 'a1111111-1111-1111-1111-111111111111';
export const PARTNER_ID = 'b2222222-2222-2222-2222-222222222222';

export function getActiveProfileId(): string {
  const stored = localStorage.getItem('activeProfileId');
  if (stored === MAIN_ID || stored === PARTNER_ID) {
    return stored;
  }
  // Default to MAIN_ID
  localStorage.setItem('activeProfileId', MAIN_ID);
  return MAIN_ID;
}

export function setActiveProfileId(id: string) {
  if (id === MAIN_ID || id === PARTNER_ID) {
    localStorage.setItem('activeProfileId', id);
  }
}
