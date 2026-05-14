/**
 * Typed Supabase error class.
 * Use this instead of throwing raw Supabase error objects so that
 * the QueryClient retry logic can inspect the error code.
 */
export class SupabaseError extends Error {
  public readonly code: string;
  public readonly details: string | null;

  constructor(error: { message: string; code: string; details: string | null }) {
    super(error.message);
    this.name = 'SupabaseError';
    this.code = error.code;
    this.details = error.details;
  }
}
