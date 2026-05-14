import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthScope } from '../../context/AuthContext';
import { updateProfile } from '../../supabase/mutations/profiles';
import { profileKeys } from './keys';
import { authQueryKeys } from '../../supabase/auth';
import type { ProfileUpdate } from '../../supabase/mutations/profiles';

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();

  return useMutation({
    mutationFn: ({ profileId, input }: { profileId: string; input: ProfileUpdate }) =>
      updateProfile(profileId, input),
    onSuccess: async (profile) => {
      // Update details cache
      queryClient.setQueryData(profileKeys.detail(householdId, profile.id), profile);
      
      // Invalidate list and context
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.lists(householdId) }),
        queryClient.invalidateQueries({ queryKey: authQueryKeys.context() }),
      ]);
    },
  });
};
