import { useQuery } from '@tanstack/react-query';
import { useAuthScope } from '../../context/AuthContext';
import { fetchProfileById, fetchProfiles } from '../../supabase/queries/profiles';
import { normalizeProfile } from '../../domain/profile';
import { profileKeys } from './keys';

export const useProfiles = () => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: profileKeys.lists(householdId),
    queryFn: () => fetchProfiles(householdId),
    select: (raw) => raw.map(normalizeProfile),
    enabled: Boolean(householdId),
  });
};

export const useProfile = (profileId: string | undefined) => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: profileKeys.detail(householdId, profileId!),
    queryFn: () => fetchProfileById(profileId!, householdId),
    select: (raw) => (raw ? normalizeProfile(raw) : null),
    enabled: Boolean(householdId && profileId),
  });
};
