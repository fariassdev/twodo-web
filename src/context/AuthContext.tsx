import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuthInfrastructureQuery } from '../supabase/auth';

// ── Public types ───────────────────────────────────────────────────────────────

export type AuthStatus =
  | 'loading'
  | 'signed_out'
  | 'pending_profile'
  | 'pending_household'
  | 'linked';

/**
 * Guaranteed non-null identity when status === 'linked'.
 * Consumed by mutations, queries, and any hook that needs auth identity.
 */
export interface AuthScope {
  userId: string;
  profileId: string;
  householdId: string;
}

interface AuthState {
  status: AuthStatus;
  scope: AuthScope | null;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({ status: 'loading', scope: null });

// ── Provider ───────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const query = useAuthInfrastructureQuery();

  const state = useMemo<AuthState>(() => {
    if (query.isPending) return { status: 'loading', scope: null };

    const ctx = query.data;
    if (!ctx || ctx.status === 'signed_out') return { status: 'signed_out', scope: null };
    if (ctx.status === 'pending_profile') return { status: 'pending_profile', scope: null };
    if (ctx.status === 'pending_household') return { status: 'pending_household', scope: null };

    if (ctx.status === 'linked' && ctx.profile?.id && ctx.household?.id) {
      return {
        status: 'linked',
        scope: {
          userId: ctx.session?.user.id ?? '',
          profileId: ctx.profile.id,
          householdId: ctx.household.id,
        },
      };
    }

    return { status: 'loading', scope: null };
  }, [
    query.isPending,
    query.data?.status,
    query.data?.session?.user.id,
    query.data?.profile?.id,
    query.data?.household?.id,
  ]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

// ── Hooks ──────────────────────────────────────────────────────────────────────

/**
 * Returns the full auth state including status.
 * Use in route guards, loading states, and conditional rendering.
 */
export const useAuthState = (): AuthState => useContext(AuthContext);

/**
 * Returns the guaranteed non-null AuthScope.
 * ONLY call this inside routes protected by LinkedAppOutlet.
 * Throws if the scope is null.
 */
export const useAuthScope = (): AuthScope => {
  const { scope } = useContext(AuthContext);
  if (!scope) {
    throw new Error(
      '[AuthContext] useAuthScope() called before auth is resolved. ' +
      'Make sure this hook is only used inside the LinkedAppOutlet route tree.',
    );
  }
  return scope;
};
