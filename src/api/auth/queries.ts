import { useAuthScope } from '@/src/context/AuthContext';
import { useProfile } from '../profiles';


export const useCurrentProfile = () => {
  const { profileId } = useAuthScope();
  return useProfile(profileId);
};
