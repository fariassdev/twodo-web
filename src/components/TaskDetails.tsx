import React, { useState } from 'react';
import {
  useAuthContextQuery,
  useCompleteTaskMutation,
  useDeleteTaskMutation,
  useDeleteTaskSeriesMutation,
  useLoveNoteForTaskQuery,
  usePostponeTaskMutation,
  useProfileQuery,
  useTaskByIdQuery,
} from '../lib/queryHooks';
import { useTranslation } from 'react-i18next';
import TopBar from './ui/TopBar';
import DataStatusBanner from './ui/DataStatusBanner';
import QueryErrorState from './ui/QueryErrorState';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

import { useNavigate, useParams } from '@tanstack/react-router';

export default function TaskDetails() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { taskId } = useParams({ strict: false }) as { taskId: string };
  const authContextQuery = useAuthContextQuery();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const taskQuery = useTaskByIdQuery(taskId);
  const task = taskQuery.data ?? null;

  const loveNoteQuery = useLoveNoteForTaskQuery(task?.id);
  const assignedProfileQuery = useProfileQuery(task?.assigned_to ?? undefined);
  const lastDoneByProfileQuery = useProfileQuery(task?.last_done_by ?? undefined);

  const completeTaskMutation = useCompleteTaskMutation();
  const postponeTaskMutation = usePostponeTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const deleteTaskSeriesMutation = useDeleteTaskSeriesMutation();

  const loveNote = loveNoteQuery.data ?? null;
  const assignedProfile = assignedProfileQuery.data ?? null;
  const lastDoneByProfile = lastDoneByProfileQuery.data ?? null;

  const loading =
    authContextQuery.isPending ||
    taskQuery.isPending ||
    (Boolean(task) &&
      (loveNoteQuery.isLoading || assignedProfileQuery.isLoading || lastDoneByProfileQuery.isLoading));

  const acting =
    completeTaskMutation.isPending ||
    postponeTaskMutation.isPending ||
    deleteTaskMutation.isPending ||
    deleteTaskSeriesMutation.isPending;

  const isStale =
    taskQuery.isStale ||
    loveNoteQuery.isStale ||
    assignedProfileQuery.isStale ||
    lastDoneByProfileQuery.isStale;

  const isFetching =
    taskQuery.isFetching ||
    loveNoteQuery.isFetching ||
    assignedProfileQuery.isFetching ||
    lastDoneByProfileQuery.isFetching;

  async function handleComplete() {
    if (!task || acting) return;
    setActionError(null);
    try {
      await completeTaskMutation.mutateAsync(task.id);
      navigate({ to: '/' });
    } catch (err) {
      console.error('Complete error:', err);
      setActionError(t('queryState.mutationError'));
    }
  }

  async function handlePostpone() {
    if (!task || acting) return;
    setActionError(null);
    try {
      await postponeTaskMutation.mutateAsync(task.id);
      navigate({ to: '/' });
    } catch (err) {
      console.error('Postpone error:', err);
      setActionError(t('queryState.mutationError'));
    }
  }

  async function handleDeleteSingle() {
    if (!task) return;
    setActionError(null);
    try {
      await deleteTaskMutation.mutateAsync(task.id);
      navigate({ to: '/' });
    } catch (err) {
      console.error('Delete error:', err);
      setActionError(t('queryState.mutationError'));
    }
  }

  async function handleDeleteFollowing() {
    if (!task || !task.recurrence_id) return;
    setActionError(null);
    try {
      await deleteTaskSeriesMutation.mutateAsync({
        recurrenceId: task.recurrence_id,
        fromDate: task.date || undefined,
      });
      navigate({ to: '/' });
    } catch (err) {
      console.error('Delete series error:', err);
      setActionError(t('queryState.mutationError'));
    }
  }

  async function handleDeleteAll() {
    if (!task || !task.recurrence_id) return;
    setActionError(null);
    try {
      await deleteTaskSeriesMutation.mutateAsync({ recurrenceId: task.recurrence_id });
      navigate({ to: '/' });
    } catch (err) {
      console.error('Delete all error:', err);
      setActionError(t('queryState.mutationError'));
    }
  }

  const statusLabels: Record<string, string> = {
    pending: t('taskDetails.status.pending'),
    completed: t('taskDetails.status.completed'),
    postponed: t('taskDetails.status.postponed'),
  };

  const priorityLabels: Record<string, string> = {
    critical: t('entryForm.priorityCritical'),
    flexible: t('entryForm.priorityFlexible'),
  };

  const frequencyLabels: Record<string, string> = {
    daily: t('entryForm.frequencyOptions.daily'),
    weekly: t('entryForm.frequencyOptions.weekly'),
    monthly: t('entryForm.frequencyOptions.monthly'),
  };

  const assignmentLabels: Record<string, string> = {
    strict_rotation: t('taskDetails.assignment.strictRotation'),
    team_work: t('taskDetails.assignment.teamWork'),
    anyone: t('taskDetails.assignment.anyone'),
    individual: t('taskDetails.assignment.individual'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!task) {
    if (taskQuery.isError) {
      return <QueryErrorState onRetry={() => { void taskQuery.refetch(); }} />;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-400">{t('taskDetails.notFound')}</p>
        <button onClick={() => navigate({ to: '/' })} className="text-primary font-bold">{t('taskDetails.back')}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-32">
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden flex flex-col pointer-events-auto z-10">
            <div className="p-6 pb-4">
              <h3 className="text-lg font-bold text-slate-100 mb-2">{t('taskDetails.deleteRecurringTitle')}</h3>
              <p className="text-slate-400 text-sm">{t('taskDetails.deleteRecurringDescription')}</p>
            </div>
            <div className="flex flex-col border-t border-slate-700 divide-y divide-slate-700">
              <button onClick={handleDeleteSingle} className="p-4 text-left text-slate-100 hover:bg-slate-700 transition-colors font-medium">{t('taskDetails.deleteOnlyThis')}</button>
              <button onClick={handleDeleteFollowing} className="p-4 text-left text-slate-100 hover:bg-slate-700 transition-colors font-medium">{t('taskDetails.deleteThisAndFollowing')}</button>
              <button onClick={handleDeleteAll} className="p-4 text-left text-rose-500 hover:bg-slate-700 transition-colors font-medium">{t('taskDetails.deleteAll')}</button>
              <button onClick={() => setDeleteModalOpen(false)} className="p-4 text-center text-slate-400 hover:bg-slate-700 transition-colors font-medium bg-slate-800/50">{t('cta.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      <TopBar
        title={task.type === 'event' ? t('taskDetails.eventDetail') : t('taskDetails.taskDetail')}
        titleIcon={task.type === 'event' ? 'event' : 'task_alt'}
        leftAction={{
          ariaLabel: t('topBar.back'),
          icon: 'arrow_back',
          onClick: () => navigate({ to: '/' }),
        }}
        rightMenu={!task.deleted_at ? {
          ariaLabel: t('topBar.openMenu'),
          closeAriaLabel: t('topBar.closeMenu'),
          open: menuOpen,
          onOpenChange: setMenuOpen,
          items: [
            {
              id: 'edit-task',
              icon: 'edit',
              label: t('taskDetails.edit'),
              onClick: () => {
                navigate({ to: '/task/$taskId/edit', params: { taskId: task.id } });
              },
            },
            {
              id: 'delete-task',
              icon: 'delete',
              label: t('taskDetails.delete'),
              danger: true,
              separatorBefore: true,
              onClick: async () => {
                if (task.recurrence_id) {
                  setDeleteModalOpen(true);
                  return;
                }

                if (window.confirm(t('taskDetails.confirmDeleteSingle'))) {
                  setActionError(null);
                  try {
                    await deleteTaskMutation.mutateAsync(task.id);
                    navigate({ to: '/' });
                  } catch (error) {
                    console.error('Delete error:', error);
                    setActionError(t('queryState.mutationError'));
                  }
                }
              },
            },
          ],
        } : undefined}
      />

      <main className="flex-1 px-4 max-w-md mx-auto w-full">
        <DataStatusBanner isOffline={!isOnline} isStale={isStale} isFetching={isFetching} />

        <div className="pt-4 pb-6">
          {actionError && (
            <p className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100">
              {actionError}
            </p>
          )}

          <div className="flex items-center gap-2 mb-2">
            {task.deleted_at ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-500">
                {t('calendar.deletedBadge')}
              </span>
            ) : (
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                task.status === 'completed' ? 'bg-primary/20 text-primary' :
                task.status === 'postponed' ? 'bg-yellow-500/20 text-yellow-500' :
                'bg-primary/20 text-primary'
              }`}>
                {statusLabels[task.status] || task.status}
              </span>
            )}
            {assignedProfile && (
              <span className="text-slate-400 text-xs font-medium">{t('taskDetails.assignedTo', { name: assignedProfile.name })}</span>
            )}
          </div>
          {task.date && (
            <p className="text-slate-400 text-sm font-medium mb-1 capitalize">
              {new Date(task.date + 'T12:00:00').toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          <h1 className="text-3xl font-bold leading-tight mb-4">{task.title}</h1>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className={`material-symbols-outlined text-lg ${task.priority === 'critical' ? 'text-rose-500' : 'text-primary'}`}>priority_high</span>
              <span className="text-sm font-medium">{priorityLabels[task.priority]}</span>
            </div>
            {task.is_recurring && task.frequency && (
              <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="material-symbols-outlined text-primary text-lg">repeat</span>
                <span className="text-sm font-medium">{frequencyLabels[task.frequency]}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="material-symbols-outlined text-primary text-lg">
                {task.assignment_type === 'team_work'
                  ? 'groups'
                  : task.assignment_type === 'anyone'
                    ? 'groups_2'
                    : task.assignment_type === 'individual'
                      ? 'person'
                      : 'sync_alt'}
              </span>
              <span className="text-sm font-medium">{assignmentLabels[task.assignment_type]}</span>
            </div>
          </div>

          {task.description && (
            <p className="text-slate-400 mt-4 leading-relaxed">{task.description}</p>
          )}

          {task.location && (
            <div className="flex items-center gap-2 mt-3 text-slate-400">
              <span className="material-symbols-outlined text-primary text-sm">location_on</span>
              <span className="text-sm">{task.location}</span>
            </div>
          )}

          {(task.start_time || task.end_time) && (
            <div className="flex items-center gap-2 mt-2 text-slate-400">
              <span className="material-symbols-outlined text-primary text-sm">schedule</span>
              <span className="text-sm">
                {task.start_time?.slice(0, 5)}{t('common.hourSuffix')}{task.end_time ? ` - ${task.end_time.slice(0, 5)}${t('common.hourSuffix')}` : ''}
              </span>
            </div>
          )}

          {task.status === 'pending' && !task.deleted_at && (
            <div className="flex flex-col gap-3 mt-6 mb-2">
              <button
                onClick={handleComplete}
                disabled={acting}
                className="w-full bg-primary text-background-dark h-12 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                <span className="material-symbols-outlined font-bold">check_circle</span>
                {acting ? t('taskDetails.processing') : t('taskDetails.markCompleted')}
              </button>
              <button
                onClick={handlePostpone}
                disabled={acting}
                className="w-full bg-slate-800/50 text-slate-300 h-12 rounded-xl font-bold border border-slate-700 active:scale-[0.98] transition-transform flex items-center justify-center disabled:opacity-50"
              >
                {t('taskDetails.postpone')}
              </button>
            </div>
          )}
        </div>

        {loveNote && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary filled-icon">favorite</span>
              <h3 className="text-lg font-bold">{t('dashboard.loveNoteTitle')}</h3>
            </div>
            <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700 italic text-slate-300 leading-relaxed relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <span className="material-symbols-outlined text-8xl">format_quote</span>
              </div>
              "{loveNote.content}"
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">{t('taskDetails.assignmentDetails')}</h3>
          <div className="bg-slate-800/40 rounded-xl border border-slate-700 divide-y divide-slate-700">
            <div className="p-4 flex justify-between items-center">
              <span className="text-slate-400">{t('taskDetails.rotationType')}</span>
              <span className="font-medium">{assignmentLabels[task.assignment_type]}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-slate-400">{t('taskDetails.lastDoneBy')}</span>
              <span className="font-medium">{lastDoneByProfile?.name || t('taskDetails.none')}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-slate-400">{t('taskDetails.currentReward')}</span>
              <span className="font-medium text-primary">{t('taskDetails.pointsReward', { points: task.points })}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
