import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useTaskByIdQuery,
  useProfilesQuery,
  useTaskCompletionsQuery,
  useCompleteTaskMutation,
  useUpdateTaskCompletionAssignmentMutation,
} from '../../../lib/queryHooks';
import AssignmentSelector, { type AssignmentSelection } from './AssignmentSelector';
import FullPageLoading from '../../ui/FullPageLoading';
import QueryErrorState from '../../ui/QueryErrorState';
import type { TaskAssignmentOverrideType } from '../../../lib/queries';

export default function TaskAssignment() {
  const { taskId } = useParams({ strict: false }) as { taskId: string };
  const navigate = useNavigate();
  const { t } = useTranslation();

  const taskQuery = useTaskByIdQuery(taskId);
  const profilesQuery = useProfilesQuery();
  const taskCompletionsQuery = useTaskCompletionsQuery(taskId);

  const completeTaskMutation = useCompleteTaskMutation();
  const updateTaskCompletionAssignmentMutation = useUpdateTaskCompletionAssignmentMutation();

  const task = taskQuery.data;
  const profiles = profilesQuery.data ?? [];
  const completions = taskCompletionsQuery.data ?? [];

  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentSelection | null>(null);

  // Initialize selection
  useEffect(() => {
    if (!task || profiles.length === 0 || selectedAssignment) return;

    if (task.status === 'completed' && completions.length > 0) {
      if (task.assignment_type === 'team_work') {
        setSelectedAssignment({ type: 'team_work', assignedTo: [] });
      } else {
        const firstCompletion = completions[0];
        const profileId = firstCompletion.profile?.id ?? firstCompletion.completed_by ?? profiles[0]?.id ?? '';
        setSelectedAssignment({ type: 'individual', assignedTo: [profileId].filter(Boolean) });
      }
    } else {
      if (task.assignment_type === 'team_work') {
        setSelectedAssignment({ type: 'team_work', assignedTo: [] });
      } else {
        const assignedTo = task.assigned_to ?? profiles[0]?.id ?? '';
        setSelectedAssignment({ type: 'individual', assignedTo: [assignedTo].filter(Boolean) });
      }
    }
  }, [task, profiles, completions, selectedAssignment]);

  const handleConfirm = async () => {
    if (!task || !selectedAssignment) return;

    try {
      const isCompleted = task.status === 'completed';
      const { type: selectedType, assignedTo } = selectedAssignment;
      
      // Smart type preservation
      const finalType: TaskAssignmentOverrideType = selectedType === 'team_work' 
        ? 'team_work' 
        : (task.assignment_type === 'anyone' ? 'anyone' : 'individual');

      if (isCompleted) {
        await updateTaskCompletionAssignmentMutation.mutateAsync({
          taskId: task.id,
          assignmentType: finalType,
          assignedTo: assignedTo,
        });
        toast.success(t('taskCompletion.alertAssignmentUpdated'));
      } else {
        await completeTaskMutation.mutateAsync({
          taskId: task.id,
          assignmentOverride: {
            type: finalType,
            assignedTo: assignedTo,
          },
        });
        toast.success(t('taskCompletion.alertCompleted'));
      }
      
      // Go back to task details
      void navigate({ to: '/task/$taskId', params: { taskId: task.id } });
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error(t('queryState.mutationError'));
    }
  };

  if (taskQuery.isPending || profilesQuery.isPending || (task?.status === 'completed' && taskCompletionsQuery.isPending)) {
    return <FullPageLoading message={t('loading')} />;
  }

  if (taskQuery.isError || !task) {
    return <QueryErrorState onRetry={() => taskQuery.refetch()} />;
  }

  if (!selectedAssignment) return null;

  const isCompleted = task.status === 'completed';

  return (
    <AssignmentSelector
      open={true}
      profiles={profiles}
      value={selectedAssignment}
      onChange={setSelectedAssignment}
      title={isCompleted ? t('taskCompletion.editAssignment') : t('taskCompletion.selectAssignment')}
      confirmLabel={isCompleted ? t('taskCompletion.saveAssignment') : t('taskCompletion.confirmAssignment')}
      subtitle={task.title}
      onConfirm={handleConfirm}
      onCancel={() => navigate({ to: '/task/$taskId', params: { taskId: task.id } })}
      loading={completeTaskMutation.isPending || updateTaskCompletionAssignmentMutation.isPending}
    />
  );
}
