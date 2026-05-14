import { useQuery } from '@tanstack/react-query';
import { useAuthScope } from '../../context/AuthContext';
import { fetchLatestLoveNote, fetchLoveNoteForTask } from '../../supabase/love-notes';
import { loveNoteKeys } from './keys';

export const useLatestLoveNote = () => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: loveNoteKeys.latest(householdId),
    queryFn: () => fetchLatestLoveNote(householdId),
    enabled: Boolean(householdId),
  });
};

export const useLoveNoteForTask = (taskId: string | undefined) => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: loveNoteKeys.byTask(taskId!, householdId),
    queryFn: () => fetchLoveNoteForTask(taskId!, householdId),
    enabled: Boolean(householdId && taskId),
  });
};
