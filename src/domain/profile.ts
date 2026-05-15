import type { RawProfile } from "../supabase/profiles/queries";

/**
 * Normalizes a raw Supabase profile into the frontend Profile model.
 */
export const normalizeProfile = (raw: RawProfile) => {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    bio: raw.bio,
    avatar_url: raw.avatar_url,
    created_at: raw.created_at,
  };
};

/**
 * Profile type is inferred from normalizeProfile.
 */
export type Profile = ReturnType<typeof normalizeProfile>;
