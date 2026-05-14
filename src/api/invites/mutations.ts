import { useMutation } from '@tanstack/react-query';
import { acceptHouseholdInvite, createHouseholdAndInvite, getOrCreateHouseholdInvite, sendEmailInvite } from '@/src/supabase/invites';


export const useCreateHouseholdAndInvite = () => {
  return useMutation({
    mutationFn: createHouseholdAndInvite,
  });
};

export const useGetOrCreateHouseholdInvite = () => {
  return useMutation({
    mutationFn: getOrCreateHouseholdInvite,
  });
};

export const useAcceptHouseholdInvite = () => {
  return useMutation({
    mutationFn: acceptHouseholdInvite,
  });
};

export const useSendEmailInvite = () => {
  return useMutation({
    mutationFn: sendEmailInvite,
  });
};

