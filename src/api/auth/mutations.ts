import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  signInWithPassword, 
  signUpWithPassword, 
  signOut, 
  resetPasswordForEmail, 
  updatePassword,
  resendConfirmationEmail,
  authQueryKeys 
} from '@/src/supabase/auth';

export function useResendVerification() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => resendConfirmationEmail(email),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: any) => signInWithPassword(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.context() });
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: any) => signUpWithPassword(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.context() });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => signOut(),
    onMutate: async () => {
      // Optimistic clear
      await queryClient.cancelQueries({ queryKey: authQueryKeys.context() });
      queryClient.setQueryData(authQueryKeys.context(), {
        status: 'signed_out',
        session: null,
        profile: null,
        household: null,
        role: null,
      });
      // Clear all private data
      queryClient.clear();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.context() });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) =>
      resetPasswordForEmail(email, `${window.location.origin}/auth/reset-password`),
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (password: string) => updatePassword(password),
  });
}
