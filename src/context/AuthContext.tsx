import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuthContextQuery } from '../lib/queryHooks';

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

/**
 * Single source of truth for auth state.
 *
 * Responsibilities:
 * 1. Subscribes to Supabase auth changes (via useAuthContextQuery).
 * 2. Derives a typed AuthStatus and non-null AuthScope from the raw context.
 * 3. Provides both to the component tree via AuthContext.
 *
 * Must be rendered inside PersistQueryClientProvider so that
 * useAuthContextQuery has access to the QueryClient.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // useAuthContextQuery does two things:
  //   1. Sets up the Supabase auth state-change subscription.
  //   2. Returns the current auth context from the query cache.
  const query = useAuthContextQuery();

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

    // Fallback — transitional state before all data is available
    return { status: 'loading', scope: null };
  }, [query.isPending, query.data]);

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
 * Throws if the scope is null (which should never happen in the authenticated tree).
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
