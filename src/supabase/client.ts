/**
 * Supabase client — single instance for the entire app.
 * Re-exports from lib/supabase to avoid duplication while
 * the rest of the domains (expenses, shopping, etc.) are migrated.
 */
export { supabase } from '../lib/supabase';
