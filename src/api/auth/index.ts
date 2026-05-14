/**
 * Public API for the Auth domain.
 * Components import everything from here — never from mutations.ts directly.
 */

// Queries
export {
  useProfiles,
  useProfile,
  useCurrentProfile,
} from './queries';

// Mutations
export {
  useLogin,
  useSignUp,
  useLogout,
  useForgotPassword,
  useUpdatePassword,
  useResendVerification,
} from './mutations';

