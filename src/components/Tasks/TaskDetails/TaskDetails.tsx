import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAuthScope,
  useCompleteTaskMutation,
  useDeleteTaskMutation,
  useDeleteTaskSeriesMutation,
  useLoveNoteForTaskQuery,
  usePostponeTaskMutation,
  useProfileQuery,
  useTaskByIdQuery,
  useTaskCompletionsQuery,
  useUpdateTaskCompletionAssignmentMutation,
  useProfilesQuery,
} from '../../../lib/queryHooks';
import { queryKeys } from '../../../lib/queryKeys';
import { useTranslation } from 'react-i18next';
import TopBar from '../../ui/TopBar';
import DataStatusBanner from '../../ui/DataStatusBanner';
import QueryErrorState from '../../ui/QueryErrorState';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import ErrorBanner from '../../ui/ErrorBanner';
import Modal from '../../ui/Modal';
import SectionHeader from '../../ui/SectionHeader';
import { useOnlineStatus } from '../../../hooks/useOnlineStatus';
import AssignmentSelector, { type AssignmentSelection } from '../AssignmentSelector';
import AssignmentEditor from '../AssignmentEditor';
import type { TaskAssignmentOverrideType } from '../../../lib/queries';

import { useNavigate, useParams, useSearch } from '@tanstack/react-router';

type MetaChipProps = {
  icon: string;
  label: string;
  iconClassName?: string;
};

function MetaChip({ icon, label, iconClassName }: Readonly<MetaChipProps>): React.ReactElement {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5">
      <span className={`material-symbols-outlined text-lg ${iconClassName ?? 'text-primary'}`}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export default function TaskDetails() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();
  const isOnline = useOnlineStatus();
  const { taskId } = useParams({ strict: false }) as { taskId: string };
  const searchParams = useSearch({ strict: false }) as { editAssignment?: boolean };
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentSelectorOpen, setAssignmentSelectorOpen] = useState(false);
  const [assignmentEditorOpen, setAssignmentEditorOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const taskQuery = useTaskByIdQuery(taskId);
  const task = taskQuery.data ?? null;
  const taskCompletionsQuery = useTaskCompletionsQuery(task?.id);
  const profilesQuery = useProfilesQuery();

  const loveNoteQuery = useLoveNoteForTaskQuery(task?.id);
  const assignedProfileQuery = useProfileQuery(task?.assigned_to ?? undefined);
  const lastDoneByProfileQuery = useProfileQuery(task?.last_done_by ?? undefined);

  const completeTaskMutation = useCompleteTaskMutation();
  const postponeTaskMutation = usePostponeTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const deleteTaskSeriesMutation = useDeleteTaskSeriesMutation();
  const updateTaskCompletionAssignmentMutation = useUpdateTaskCompletionAssignmentMutation();

  const loveNote = loveNoteQuery.data ?? null;
  const assignedProfile = assignedProfileQuery.data ?? null;
  const lastDoneByProfile = lastDoneByProfileQuery.data ?? null;
  const completions = taskCompletionsQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];

  const defaultSelection = useMemo<AssignmentSelection>(() => {
    if (!task) return { type: 'anyone', assignedTo: [] };
    if (task.assignment_type === 'team_work') return { type: 'team_work', assignedTo: [] };
    if (task.assignment_type === 'individual' || task.assignment_type === 'strict_rotation') {
      return { type: 'individual', assignedTo: [task.assigned_to ?? profiles[0]?.id ?? ''].filter(Boolean) };
    }
    return { type: 'anyone', assignedTo: [] };
  }, [profiles, task]);

  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentSelection>({
    type: 'anyone',
    assignedTo: [],
  });

  function normalizeForMutation(selection: AssignmentSelection): {
    type: TaskAssignmentOverrideType;
    assignedTo: string[];
  } {
    if (selection.type === 'individual') {
      const fallbackId = task?.assigned_to ?? profiles[0]?.id ?? '';
      const selectedId = selection.assignedTo[0] ?? fallbackId;
      return { type: 'individual', assignedTo: selectedId ? [selectedId] : [] };
    }
    return { type: selection.type, assignedTo: [] };
  }

  const safeDefaultAssignmentType =
    task?.assignment_type === 'strict_rotation' ||
    task?.assignment_type === 'team_work' ||
    task?.assignment_type === 'individual' ||
    task?.assignment_type === 'anyone'
      ? task.assignment_type
      : 'anyone';

  useEffect(() => {
    if (!searchParams.editAssignment || task?.status !== 'completed') return;
    setSelectedAssignment(defaultSelection);
    setAssignmentEditorOpen(true);
  }, [defaultSelection, searchParams.editAssignment, task?.status]);

  const loading =
    taskQuery.isPending ||
    (Boolean(task) &&
      (loveNoteQuery.isLoading ||
        assignedProfileQuery.isLoading ||
        lastDoneByProfileQuery.isLoading ||
        taskCompletionsQuery.isLoading ||
        profilesQuery.isLoading));

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
      await completeTaskMutation.mutateAsync({
        taskId: task.id,
        assignmentOverride: normalizeForMutation(selectedAssignment),
      });
      navigate({ to: '/' });
    } catch (err) {
      console.error('Complete error:', err);
      setActionError(t('queryState.mutationError'));
    }
  }

  async function handleUpdateAssignment() {
    if (!task) return;
    setActionError(null);
    try {
      await updateTaskCompletionAssignmentMutation.mutateAsync({
        taskId: task.id,
        assignmentType: normalizeForMutation(selectedAssignment).type,
        assignedTo: normalizeForMutation(selectedAssignment).assignedTo,
      });
      setAssignmentEditorOpen(false);
    } catch (err) {
      console.error('Update assignment error:', err);
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
    expired: t('taskDetails.status.expired'),
    overdue: t('taskDetails.status.overdue'),
  };

  const urgencyLabels: Record<string, string> = {
    normal: t('entryForm.urgencyNormal'),
    high: t('entryForm.urgencyHigh'),
  };

  const timeOfDayLabels: Record<string, string> = {
    morning: t('entryForm.timeOfDayOptions.morning'),
    afternoon: t('entryForm.timeOfDayOptions.afternoon'),
    evening: t('entryForm.timeOfDayOptions.evening'),
    anytime: t('entryForm.timeOfDayOptions.anytime'),
  };

  const categoryLabels: Record<string, string> = {
    trash: t('entryForm.categories.trash'),
    cleaning: t('entryForm.categories.cleaning'),
    bathroom: t('entryForm.categories.bathroom'),
    kitchen: t('entryForm.categories.kitchen'),
    shopping: t('entryForm.categories.shopping'),
    laundry: t('entryForm.categories.laundry'),
    other: t('entryForm.categories.other'),
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

  const statusToneMap: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
    pending: 'primary',
    completed: 'success',
    postponed: 'warning',
    expired: 'neutral',
    overdue: 'warning',
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
      return (
        <QueryErrorState
          onRetry={() => {
            if (!householdId) return;
            void queryClient.refetchQueries({ queryKey: queryKeys.tasks.detail(taskId, householdId) });
          }}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-400">{t('taskDetails.notFound')}</p>
        <Button onClick={() => navigate({ to: '/' })} size="sm" variant="ghost">
          {t('taskDetails.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-32">
      <Modal open={deleteModalOpen} overlayAriaLabel={t('cta.cancel')} onClose={() => setDeleteModalOpen(false)}>
        <Card className="overflow-hidden" padding="none" radius="2xl" variant="modal">
          <div className="p-6 pb-4">
            <h3 className="mb-2 text-lg font-bold text-slate-100">{t('taskDetails.deleteRecurringTitle')}</h3>
            <p className="text-sm text-slate-400">{t('taskDetails.deleteRecurringDescription')}</p>
          </div>
          <div className="flex flex-col divide-y divide-slate-700 border-t border-slate-700">
            <Button className="justify-start" onClick={handleDeleteSingle} size="menu" variant="modalAction">
              {t('taskDetails.deleteOnlyThis')}
            </Button>
            <Button className="justify-start" onClick={handleDeleteFollowing} size="menu" variant="modalAction">
              {t('taskDetails.deleteThisAndFollowing')}
            </Button>
            <Button className="justify-start text-rose-500" onClick={handleDeleteAll} size="menu" variant="modalAction">
              {t('taskDetails.deleteAll')}
            </Button>
            <Button className="justify-center bg-slate-800/50 text-slate-400" onClick={() => setDeleteModalOpen(false)} size="menu" variant="modalAction">
              {t('cta.cancel')}
            </Button>
          </div>
        </Card>
      </Modal>

      {(task.status === 'pending' || task.status === 'overdue') && (
        <AssignmentSelector
          open={assignmentSelectorOpen}
          defaultAssignmentType={safeDefaultAssignmentType}
          defaultAssignedTo={task.assigned_to}
          profiles={profiles}
          value={selectedAssignment}
          onChange={setSelectedAssignment}
          onConfirm={async () => {
            setAssignmentSelectorOpen(false);
            await handleComplete();
          }}
          onCancel={() => setAssignmentSelectorOpen(false)}
          loading={completeTaskMutation.isPending}
        />
      )}

      {task.status === 'completed' && (
        <AssignmentEditor
          open={assignmentEditorOpen}
          profiles={profiles}
          completions={completions}
          defaultAssignmentType={safeDefaultAssignmentType}
          defaultAssignedTo={task.assigned_to}
          value={selectedAssignment}
          onChange={setSelectedAssignment}
          onSave={handleUpdateAssignment}
          onCancel={() => setAssignmentEditorOpen(false)}
          loading={updateTaskCompletionAssignmentMutation.isPending}
        />
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
          {actionError ? <ErrorBanner className="mb-4" message={actionError} /> : null}

          <div className="flex items-center gap-2 mb-2">
            {task.deleted_at ? (
              <Badge size="md" tone="danger">
                {t('calendar.deletedBadge')}
              </Badge>
            ) : (
              <Badge size="md" tone={statusToneMap[task.status] ?? 'primary'}>
                {statusLabels[task.status] || task.status}
              </Badge>
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
            {task.type === 'task' && (
              <MetaChip
                icon="priority_high"
                iconClassName={task.priority === 'high' ? 'text-rose-500' : 'text-primary'}
                label={urgencyLabels[task.priority] || task.priority}
              />
            )}
            {task.type === 'task' && task.effort_level && (
              <MetaChip icon="fitness_center" label={t(`entryForm.effortLevels.${task.effort_level}` as const)} />
            )}
            {task.type === 'task' && task.time_of_day && (
              <MetaChip icon="schedule" label={timeOfDayLabels[task.time_of_day] || task.time_of_day} />
            )}
            {task.type === 'task' && task.category && (
              <MetaChip icon="category" label={categoryLabels[task.category] || task.category} />
            )}
            {task.is_recurring && task.frequency && (
              <MetaChip icon="repeat" label={frequencyLabels[task.frequency]} />
            )}
            <MetaChip
              icon={
                task.assignment_type === 'team_work'
                  ? 'groups'
                  : task.assignment_type === 'anyone'
                    ? 'groups_2'
                    : task.assignment_type === 'individual'
                      ? 'person'
                      : 'sync_alt'
              }
              label={assignmentLabels[task.assignment_type]}
            />
          </div>

          {task.description && (
            <p className="text-slate-400 mt-4 leading-relaxed">{task.description}</p>
          )}

          {task.type === 'event' && task.location && (
            <div className="flex items-center gap-2 mt-3 text-slate-400">
              <span className="material-symbols-outlined text-primary text-sm">location_on</span>
              <span className="text-sm">{task.location}</span>
            </div>
          )}

          {task.type === 'event' && (task.start_time || task.end_time) && (
            <div className="flex items-center gap-2 mt-2 text-slate-400">
              <span className="material-symbols-outlined text-primary text-sm">schedule</span>
              <span className="text-sm">
                {task.start_time?.slice(0, 5)}{t('common.hourSuffix')}{task.end_time ? ` - ${task.end_time.slice(0, 5)}${t('common.hourSuffix')}` : ''}
              </span>
            </div>
          )}

          {(task.status === 'pending' || task.status === 'overdue') && !task.deleted_at && (
            <div className="flex flex-col gap-3 mt-6 mb-2">
              <Button
                className="justify-center shadow-lg shadow-primary/20"
                fullWidth
                onClick={() => {
                  setSelectedAssignment(defaultSelection);
                  setAssignmentSelectorOpen(true);
                }}
                disabled={acting}
              >
                <span className="material-symbols-outlined font-bold">check_circle</span>
                {acting ? t('taskDetails.processing') : t('taskDetails.markCompleted')}
              </Button>
              <Button
                className="justify-center border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/60"
                fullWidth
                onClick={handlePostpone}
                disabled={acting}
                variant="subtle"
              >
                {t('taskDetails.postpone')}
              </Button>
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
          <SectionHeader>{t('taskDetails.assignmentDetails')}</SectionHeader>
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

          {task.status === 'completed' && (
            <Button
              className="text-sm font-semibold"
              fullWidth
              onClick={() => {
                setSelectedAssignment(defaultSelection);
                setAssignmentEditorOpen(true);
              }}
              variant="subtle"
            >
              {t('taskCompletion.editAssignment')}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
