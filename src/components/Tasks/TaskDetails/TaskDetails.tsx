import React, { useMemo, useState } from 'react';
import { useLoveNoteForTask } from '../../../api/love-notes';
import { useTask, useDeleteTask, useDeleteTaskSeries, useCompleteTask } from '../../../api/tasks';
import { 
  Trash2, 
  CookingPot, 
  ShoppingBasket, 
  Shirt, 
  Star,
  Dumbbell,
  Clock,
  Repeat,
  CheckCircle2,
  RefreshCw,
  Heart,
  SquarePen,
  CalendarHeart,
  Toilet,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../ui/PageHeader';
import DataStatusBanner from '../../ui/DataStatusBanner';
import QueryErrorState from '../../ui/QueryErrorState';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import ErrorBanner from '../../ui/ErrorBanner';
import Modal from '../../ui/Modal';
import FullPageLoading from '../../ui/FullPageLoading';
import { useOnlineStatus } from '../../../hooks/useOnlineStatus';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { TaskDetailsSearch } from '@/src/router';
import { ContextMenu } from '../../ui/ContextMenu/ContextMenu';
import { useProfiles } from '@/src/api/profiles';
import InfoTile from '../../ui/InfoTile';

const categoryIcons: Record<string, any> = {
  trash: Trash2,
  cleaning: Sparkles,
  bathroom: Toilet,
  kitchen: CookingPot,
  shopping: ShoppingBasket,
  laundry: Shirt,
  other: CalendarHeart,
};

const statusToneMap: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'primary',
  completed: 'success',
  expired: 'neutral',
  past_due: 'warning',
};

export default function TaskDetails() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { from } = useSearch({ strict: false }) as Partial<TaskDetailsSearch>;
  const { taskId } = useParams({ strict: false }) as { taskId: string };
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const taskQuery = useTask({ id: taskId });
  const task = taskQuery.data ?? null;
  const profilesQuery = useProfiles();

  const loveNoteQuery = useLoveNoteForTask(task?.id);

  const deleteTaskMutation = useDeleteTask();
  const deleteTaskSeriesMutation = useDeleteTaskSeries();
  const completeTaskMutation = useCompleteTask();

  const loveNote = loveNoteQuery.data ?? null;
  const assignedProfile = task?.assigned_profile;
  const profiles = profilesQuery.data ?? [];

  const loading = taskQuery.isLoading || (Boolean(task) && profilesQuery.isLoading);
  const acting = completeTaskMutation.isPending || deleteTaskMutation.isPending || deleteTaskSeriesMutation.isPending;

  const isStale = loveNoteQuery.isStale || taskQuery.isStale;
  const isFetching = loveNoteQuery.isFetching || taskQuery.isFetching;

  async function handleDeleteSingle() {
    if (!task) return;
    try {
      setActionError(null);
      await deleteTaskMutation.mutateAsync({ taskId: task.id });
      setDeleteModalOpen(false);
      navigate({ to: (from === 'calendar' ? '/calendar' : '/') });
    } catch {
      setActionError(t('tasks.details.deleteError'));
    }
  }

  async function handleDeleteFollowing() {
    if (!task || !task.recurrence_id) return;
    try {
      setActionError(null);
      await deleteTaskSeriesMutation.mutateAsync({ 
        seriesId: task.recurrence_id, 
        fromDate: task.date || undefined 
      });
      setDeleteModalOpen(false);
      navigate({ to: (from === 'calendar' ? '/calendar' : '/') });
    } catch {
      setActionError(t('tasks.details.deleteError'));
    }
  }

  async function handleDeleteAll() {
    if (!task || !task.recurrence_id) return;
    try {
      setActionError(null);
      await deleteTaskSeriesMutation.mutateAsync({ 
        seriesId: task.recurrence_id 
      });
      setDeleteModalOpen(false);
      navigate({ to: (from === 'calendar' ? '/calendar' : '/') });
    } catch {
      setActionError(t('tasks.details.deleteError'));
    }
  }

  async function handleComplete() {
    if (!task) return;
    try {
      setActionError(null);
      await completeTaskMutation.mutateAsync({ taskId: task.id });
      navigate({ to: (from === 'calendar' ? '/calendar' : '/') });
    } catch {
      setActionError(t('tasks.details.completeError'));
    }
  }

  const handleDeleteClick = () => {
    if (!task) return;
    if (task.recurrence_id) {
      setDeleteModalOpen(true);
      return;
    }
    
    if (window.confirm(t('taskDetails.confirmDeleteSingle'))) {
      handleDeleteSingle();
    }
  };

  const isCompleted = task?.status === 'completed';

  const assignmentText = useMemo(() => {
    if (!task) return '';
    if (task.assignment_type === 'team_work') {
      return isCompleted ? t('dashboard.completedByBoth') : t('taskDetails.assignment.teamWork');
    }
    return assignedProfile?.name || (isCompleted ? t('common.partnerFallback') : t('taskDetails.assignment.anyone'));
  }, [task, isCompleted, assignedProfile, t]);

  const assignmentAvatars = useMemo(() => {
    if (!task) return [];
    if (task.assignment_type === 'team_work') return profiles.slice(0, 2);
    if (isCompleted || task.assignment_type !== 'anyone') return [assignedProfile];
    return profiles.slice(0, 2);
  }, [task, isCompleted, assignedProfile, profiles]);



  if (loading) return <FullPageLoading message={t('loading')} />;

  if (!task) {
    return <QueryErrorState onRetry={() => window.location.reload()} />;
  }

  const CategoryIcon = categoryIcons[task.category || 'other'];

  const handleBack = () => {
    if (from === 'calendar') {
      return navigate({ to: '/calendar' });
    }
    
    return navigate({ to: '/' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light">
      <Modal open={deleteModalOpen} overlayAriaLabel={t('cta.cancel')} onClose={() => setDeleteModalOpen(false)}>
        <Card className="overflow-hidden" padding="none" radius="2xl" variant="modal">
          <div className="p-6 pb-4">
            <h3 className="mb-2 text-lg font-bold text-surface-2">{t('taskDetails.deleteRecurringTitle')}</h3>
            <p className="text-sm text-surface-2/60">{t('taskDetails.deleteRecurringDescription')}</p>
          </div>
          <div className="flex flex-col divide-y divide-border-subtle border-t border-border-subtle">
            <Button className="justify-start" onClick={handleDeleteSingle} size="menu" variant="modalAction">{t('taskDetails.deleteOnlyThis')}</Button>
            <Button className="justify-start" onClick={handleDeleteFollowing} size="menu" variant="modalAction">{t('taskDetails.deleteThisAndFollowing')}</Button>
            <Button className="justify-start text-rose-500" onClick={handleDeleteAll} size="menu" variant="modalAction">{t('taskDetails.deleteAll')}</Button>
            <Button className="justify-center bg-surface-1 text-surface-2/60" onClick={() => setDeleteModalOpen(false)} size="menu" variant="modalAction">{t('cta.cancel')}</Button>
          </div>
        </Card>
      </Modal>

      <PageHeader
        title={t('taskDetails.taskDetails')}
        subtitle={t('taskDetails.tasks')}
        backAction={{ onClick: handleBack }}
        rightSlot={!task.deleted_at ? (
          <ContextMenu
            ariaLabel={t('topBar.openMenu')}
            items={[
              { 
                type: 'action', 
                id: 'edit', 
                icon: 'edit', 
                label: t('cta.edit'), 
                onClick: () => navigate({ to: '/task/$taskId/edit', params: { taskId: task.id } }) 
              },
              { type: 'divider', id: 'div1' },
              { 
                type: 'action',
                id: 'delete', 
                icon: 'delete_outline', 
                label: t('cta.delete'), 
                danger: true, 
                onClick: handleDeleteClick,
              },
            ]}
          />
        ) : undefined}
      />

      <main className="relative flex-1 px-6 pb-24 overflow-x-hidden">
        {/* Category Hero Background Icon */}
        <div className="absolute top-[-20px] right-[-40px] opacity-[0.03] pointer-events-none select-none z-0 -rotate-12">
          <CategoryIcon size={320} strokeWidth={1} />
        </div>
        
        <div className="relative z-10 max-w-md mx-auto w-full">
          <DataStatusBanner isOffline={!isOnline} isStale={isStale} isFetching={isFetching} />
          
          <div className="mt-4 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge size="md" tone={statusToneMap[task.status] ?? 'primary'}>
                {t(`taskDetails.status.${task.status}`)}
              </Badge>
              {task.priority === 'high' && (
                <Badge size="md" tone="danger">{t('entryForm.urgencyHigh')}</Badge>
              )}
            </div>

            <h1 className="text-4xl font-black text-surface-2 leading-[1.1] tracking-tight mb-2">
              {task.title}
            </h1>
            
            {task.date && (
              <p className="text-primary font-bold text-lg">
                {new Date(task.date + 'T12:00:00').toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            )}

            {task.description && (
              <p className="mt-4 text-surface-2/60 leading-relaxed font-medium max-w-[90%]">
                {task.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <InfoTile 
              icon={Star} 
              label={t('taskDetails.currentReward')} 
              value={t('taskDetails.pointsReward', { points: task.points })} 
            />
            {task.effort_level && (
              <InfoTile 
                icon={Dumbbell} 
                label={t('taskDetails.effort')} 
                value={t(`entryForm.effortLevels.${task.effort_level}`)} 
              />
            )}
            {task.time_of_day && (
              <InfoTile 
                icon={Clock} 
                label={t('taskDetails.time')} 
                value={t(`entryForm.timeOfDayOptions.${task.time_of_day}`)} 
              />
            )}
            {task.is_recurring && task.frequency && (
              <InfoTile 
                icon={Repeat} 
                label={t('taskDetails.frequency')} 
                value={t(`entryForm.frequencyOptions.${task.frequency}`)} 
              />
            )}
          </div>

          {/* Assignment Card */}
          <div className="bg-surface-1/40 border border-border-subtle rounded-2xl p-6 mb-10">
            <div className={`flex justify-between items-center ${task.assignment_type === 'strict_rotation' ? 'mb-6' : ''}`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/40 block mb-1">
                  {isCompleted ? t('taskDetails.lastDoneBy') : t('taskDetails.assignedToTitle', 'Assigned To')}
                </span>
                <h3 className="text-xl font-black text-surface-2">
                  {assignmentText}
                </h3>
              </div>
              <div className="flex -space-x-3">
                {assignmentAvatars.filter(Boolean).map((p) => (
                  <div key={p?.id} className="w-10 h-10 rounded-full border-4 border-surface-1 overflow-hidden bg-primary/10">
                    {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-primary text-xs">{p?.name?.charAt(0)}</div>}
                  </div>
                ))}
              </div>
            </div>
            
            {task.assignment_type === 'strict_rotation' && (
              <div className="flex items-center gap-2 py-3 px-4 bg-primary/5 rounded-2xl border border-primary/10">
                <RefreshCw size={18} className="text-primary" />
                <span className="text-xs font-bold text-primary/80 tracking-tight uppercase">
                  {t(`taskDetails.assignment.${task.assignment_type.replace(/_([a-z])/g, (_, p1) => p1.toUpperCase())}`)}
                </span>
              </div>
            )}
          </div>

          {loveNote && (
            <div className="relative mb-10 group">
              <div className="absolute -left-2 -top-2 w-10 h-10 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-primary/5 p-6 rounded-3xl border-2 border-dashed border-primary/20">
                <Heart size={24} className="text-primary mb-2 fill-primary/20" />
                <p className="italic font-medium text-primary text-lg leading-relaxed">"{loveNote.content}"</p>
              </div>
            </div>
          )}

          {task.status === 'expired' && (
            <div className="mb-10 p-6 rounded-3xl bg-surface-1 border border-border-subtle flex gap-4 items-start shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-surface-2/5 flex items-center justify-center shrink-0">
                <Clock size={20} className="text-surface-2/40" />
              </div>
              <p className="text-sm text-surface-2/60 leading-relaxed font-medium">
                {t(`taskDetails.expiration.${task.frequency === 'daily' ? 'daily' : 'others'}`)}
              </p>
            </div>
          )}

          {actionError && <ErrorBanner className="mb-6" message={actionError} />}

          {/* Fixed Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light via-background-light to-transparent pt-12 z-20 pointer-events-none">
            <div className="max-w-md mx-auto w-full flex gap-3 pointer-events-auto">
              {!isCompleted && !task.deleted_at && (
                <Button 
                  className="flex-1 justify-center shadow-button h-14 rounded-2xl group" 
                  onClick={() => navigate({ to: '/task/$taskId/assignment', params: { taskId: task.id } })}
                  disabled={acting || task.status === 'expired'}
                >
                  <CheckCircle2 size={24} className="group-active:scale-125 transition-transform" />
                  {t('taskDetails.markCompleted')}
                </Button>
              )}
              {isCompleted && (
                <Button 
                  fullWidth 
                  variant="subtle" 
                  className="h-14 rounded-2xl" 
                  onClick={() => navigate({ to: '/task/$taskId/assignment', params: { taskId: task.id } })}
                >
                  <SquarePen size={24} />
                  {t('taskCompletion.editAssignment')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
