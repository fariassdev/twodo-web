import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useProfilesQuery,
  useAuthScope,
} from '../../../lib/queryHooks';
import { useTask, useTaskCompletions, useTaskActions } from '../../../api/hooks';
import { TaskAssignmentOverrideType } from '../../../api/mutations/tasks';
import AssignmentSelector, { type AssignmentSelection } from './AssignmentSelector';
import FullPageLoading from '../../ui/FullPageLoading';
import QueryErrorState from '../../ui/QueryErrorState';

export default function TaskAssignment() {
  const { taskId } = useParams({ strict: false }) as { taskId: string };
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { task, loading: taskLoading } = useTask({ id: taskId });
  const profilesQuery = useProfilesQuery();
  const { completions, loading: completionsLoading } = useTaskCompletions(taskId);

  const { completeTask, updateTaskCompletionAssignment, isLoading: acting } = useTaskActions();

  const profiles = profilesQuery.data ?? [];

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
        await updateTaskCompletionAssignment(task.id, finalType, assignedTo);
        toast.success(t('taskCompletion.assignmentUpdated'));
      } else {
        await completeTask(task.id, {
          type: finalType,
          assignedTo: assignedTo,
        });
        toast.success(t('taskCompletion.completed'));
      }
      
      // Go back to task details
      void navigate({ to: '/task/$taskId', params: { taskId: task.id }, replace: true });
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error(t('queryState.mutationError'));
    }
  };

  const { profileId } = useAuthScope();

  if (taskLoading || profilesQuery.isPending || (task?.status === 'completed' && completionsLoading)) {
    return <FullPageLoading message={t('loading')} />;
  }

  if (!task) {
    return <QueryErrorState onRetry={() => window.location.reload()} />;
  }

  if (!selectedAssignment) return null;

  const isCompleted = task.status === 'completed';
  const isHelpingOut = !isCompleted && (task.assignment_type === 'individual' || task.assignment_type === 'strict_rotation') && task.assigned_to !== profileId;
  const assignedProfile = profiles.find(p => p.id === task.assigned_to);

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
      onCancel={() => window.history.back()}
      loading={acting}
    >
      {isHelpingOut && (
        <div className="relative bg-surface-1/50 backdrop-blur-sm border border-primary/10 rounded-[2rem] p-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm overflow-hidden group">
          {/* Decorative background element */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-1000" />
          
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-primary filled-icon text-2xl">volunteer_activism</span>
          </div>
          <div className="flex flex-col justify-center flex-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/50 mb-1">
              {t('taskCompletion.teamEffort', 'Team Effort')}
            </span>
            <p className="text-sm font-semibold text-surface-2 leading-relaxed">
              {t('taskCompletion.helpingOutMessage', { name: assignedProfile?.name || t('common.partnerFallback') })}
            </p>
          </div>
        </div>
      )}
    </AssignmentSelector>
  );
}
