import { useQuery } from '@tanstack/react-query';
import { fetchInviteInfo } from '@/src/supabase/invites';
import { inviteKeys } from './keys';

export const useInviteInfo = (inviteCode: string | null, options: { enabled?: boolean; refetchInterval?: number } = {}) => {
  return useQuery({
    queryKey: inviteKeys.info(inviteCode!),
    queryFn: () => fetchInviteInfo(inviteCode!),
    ...options,
    enabled: (options.enabled !== false) && Boolean(inviteCode),
  });
};
