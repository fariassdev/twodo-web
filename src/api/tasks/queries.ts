import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthScope } from '../../context/AuthContext';
import {
  fetchTaskById,
  fetchTaskCatalog,
  fetchTaskCompletions,
  fetchTaskCount,
  fetchTasksInRange,
} from '../../supabase/queries/tasks';
import { normalizeTask } from '../../domain/task';
import { taskKeys } from './keys';

// ── useTasksInRange ───────────────────────────────────────────────────────────

export interface UseTasksInRangeParams {
  startDate: string;
  endDate: string;
  includeDeleted?: boolean;
}

export const useTasksInRange = ({ startDate, endDate, includeDeleted = false }: UseTasksInRangeParams) => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: taskKeys.range(householdId, startDate, endDate, includeDeleted),
    queryFn: () => fetchTasksInRange(householdId, startDate, endDate, includeDeleted),
    select: (raw) => raw.map(normalizeTask),
    placeholderData: keepPreviousData,
  });
};

// ── useTask ───────────────────────────────────────────────────────────────────

export const useTask = ({ id }: { id: string | undefined }) => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: taskKeys.detail(householdId, id!),
    queryFn: () => fetchTaskById(householdId, id!),
    select: (raw) => (raw ? normalizeTask(raw) : null),
    enabled: Boolean(id),
  });
};

// ── useTaskCompletions ────────────────────────────────────────────────────────

export const useTaskCompletions = (taskId: string | undefined) => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: taskKeys.completions(householdId, taskId!),
    queryFn: () => fetchTaskCompletions(householdId, taskId!),
    enabled: Boolean(taskId),
  });
};

// ── useTaskCount ──────────────────────────────────────────────────────────────

export const useTaskCount = () => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: taskKeys.count(householdId),
    queryFn: () => fetchTaskCount(householdId),
  });
};

// ── useTaskCatalog ────────────────────────────────────────────────────────────

export const useTaskCatalog = () => {
  return useQuery({
    queryKey: taskKeys.catalog(),
    queryFn: fetchTaskCatalog,
    staleTime: 1000 * 60 * 60, // 1 hour — catalog changes rarely
    gcTime: Infinity,
  });
};

