import { useQuery } from '@tanstack/react-query';
import { getProfiles, getProfileById } from '../../lib/queries';
import { queryKeys } from '../../lib/queryKeys';
import type { Profile } from '../../lib/types';
import { useAuthScope } from '@/src/context/AuthContext';

export function useProfiles() {
  const { householdId } = useAuthScope();

  return useQuery<Profile[]>({
    queryKey: householdId ? queryKeys.profiles.list(householdId) : ['disabled', 'profiles', 'list'],
    queryFn: () => getProfiles(householdId),
    enabled: Boolean(householdId),
  });
}

export function useProfile(profileId: string | undefined) {
  const { householdId } = useAuthScope();

  return useQuery<Profile | null>({
    queryKey:
      profileId && householdId
        ? queryKeys.profiles.detail(profileId, householdId)
        : ['profiles', 'detail', 'disabled', profileId ?? 'none'],
    queryFn: () => getProfileById(profileId!, householdId),
    enabled: Boolean(profileId && householdId),
  });
}

export function useCurrentProfile() {
  const { profileId } = useAuthScope();
  return useProfile(profileId);
}
