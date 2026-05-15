import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthScope } from '../../context/AuthContext';
import { updateProfile, type ProfileUpdate } from '@/src/supabase/profiles';
import { profileKeys } from './keys';
import { authQueryKeys } from '@/src/supabase/auth';

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
