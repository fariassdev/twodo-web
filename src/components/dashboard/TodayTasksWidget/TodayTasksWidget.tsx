import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Zap, ChevronDown, ChevronUp, History, CheckCircle2, Check } from 'lucide-react';
import { useTodaysTasksQuery, useOverdueTasksQuery, useCompleteTaskMutation, useProfilesQuery } from '../../../lib/queryHooks';
import type { Task } from '../../../lib/types';
import TaskAvatars from '../TaskAvatars';
import Snackbar from '../../ui/Snackbar';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import ListRow from '../../ui/ListRow';
import SectionHeader from '../../ui/SectionHeader';

const TIME_BLOCKS = ['morning', 'afternoon', 'evening', 'anytime'] as const;

export default function TodayTasksWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const todaysTasksQuery = useTodaysTasksQuery();
  const overdueTasksQuery = useOverdueTasksQuery();
  const completeTaskMutation = useCompleteTaskMutation();
  const { data: profiles = [] } = useProfilesQuery();

  const [isPendingExpanded, setIsPendingExpanded] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [lastCompletedTask, setLastCompletedTask] = useState<Task | null>(null);

  const tasks = todaysTasksQuery.data ?? [];
  const overdueTasks = overdueTasksQuery.data ?? [];

  const sortedOverdueTasks = useMemo(() => {
    return [...overdueTasks].sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return 0;
    });
  }, [overdueTasks]);

  const allOverdueCompleted = overdueTasks.length > 0 && overdueTasks.every(t => t.status === 'completed');

  const tasksByBlock = useMemo(() => {
    const groups: Record<string, Task[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      anytime: [],
    };

    for (const task of tasks) {
      const block = task.time_of_day || 'anytime';
      if (block in groups) {
        groups[block].push(task);
      } else {
        groups.anytime.push(task);
      }
    }

    // sort completed tasks to bottom
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        return 0;
      });
    });

    return groups;
  }, [tasks]);

  const handleComplete = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
      await completeTaskMutation.mutateAsync({ taskId });
      const completedTask = tasks.find((task) => task.id === taskId) ?? overdueTasks.find((task) => task.id === taskId) ?? null;
      setLastCompletedTask(completedTask);
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Complete error', err);
    }
  };

  const lastAssignmentText =
    lastCompletedTask?.assignment_type === 'team_work'
      ? t('taskCompletion.teamWork')
      : lastCompletedTask?.assignment_type === 'individual'
        ? t('taskCompletion.individual')
        : t('taskCompletion.anyone');

  const renderTask = (task: Task) => {
    const isCompleted = task.status === 'completed';
    const showSize = task.effort_level === 'L' || task.effort_level === 'XL';
    const isHighPriority = task.priority === 'high';
    const isTeamWork = task.assignment_type === 'team_work' || task.assignment_type === 'anyone';

    return (
      <ListRow
        as="div"
        completed={isCompleted}
        key={task.id}
        onClick={() => navigate({ to: '/task/$taskId', params: { taskId: task.id } })}
        className="mb-3 shadow-sm"
        interactive
      >
        {/* Glow left edge for high priority/morning like the design */}
        {!isCompleted && isHighPriority && (
          <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-lg bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
        )}

        <Button
          className={`h-[22px] w-[22px] shrink-0 p-0 transition-colors ${
            isCompleted
              ? 'rounded-md text-emerald-500 hover:bg-transparent'
              : 'rounded-[6px] border-2 border-border-subtle text-transparent hover:bg-transparent'
          }`}
          onClick={(e) => {
            if (isCompleted) {
              e.stopPropagation();
            } else {
              handleComplete(e, task.id);
            }
          }}
          size="icon"
          variant="icon"
        >
          {isCompleted && <CheckCircle2 className="w-6 h-6 fill-emerald-500/20" />}
        </Button>

        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-base truncate flex items-center gap-3 ${
            isCompleted ? 'line-through text-slate-500' : 'text-slate-100'
          }`}>
            {task.title}
            {isHighPriority && !isCompleted && (
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            )}
            {showSize && !isCompleted && (
              <Badge size="xs" tone={task.effort_level === 'XL' ? 'warning' : 'success'}>
                {task.effort_level}
              </Badge>
            )}
          </div>
          {isCompleted && (
            <div className="text-xs text-emerald-500/80 mt-1 font-medium italic">
              {isTeamWork 
                ? t('dashboard.completedByBoth') 
                : t('dashboard.completedBy', { name: task.last_done_by_profile?.name || t('expenses.partnerFallback') })
              }
            </div>
          )}
        </div>

        <div className="flex items-center flex-shrink-0">
          <TaskAvatars task={task} profiles={profiles} />
        </div>
      </ListRow>
    );
  };

  return (
    <div className="mt-6 mb-8 relative">
      <Snackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        message={`${t('taskCompletion.completed')}. ${t('taskCompletion.pointsAssignedTo')} ${lastAssignmentText}`}
        actionLabel={t('taskCompletion.change')}
        onAction={() => {
          if (!lastCompletedTask) return;
          setSnackbarOpen(false);
          navigate({
            to: '/task/$taskId',
            params: { taskId: lastCompletedTask.id },
            search: { editAssignment: true },
          });
        }}
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">{t('dashboard.today')}</h2>
      </div>

      {TIME_BLOCKS.map(block => {
        const blockTasks = tasksByBlock[block];
        if (!blockTasks || blockTasks.length === 0) return null;

        return (
          <div key={block} className="mb-6 relative">
            <SectionHeader className="mb-3 flex items-center gap-2 px-0 text-[10px] text-gray-400">
              {t(`dashboard.timeBlocks.${block}`)}
              <div className="h-[1px] flex-1 bg-surface-1"></div>
            </SectionHeader>
            <div>
              {blockTasks.map(renderTask)}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && overdueTasks.length === 0 && (
        <ListRow as="div" className="justify-center rounded-3xl border-dashed p-8 text-center text-slate-500" variant="default">
          {t('dashboard.noTasksFound')}
        </ListRow>
      )}

      {overdueTasks.length > 0 && (
        <div className="mt-8">
          <ListRow
            as="div"
            onClick={() => setIsPendingExpanded(!isPendingExpanded)}
            className="justify-between"
            interactive
            variant={allOverdueCompleted ? 'success' : 'alert'}
          >
            <div className="flex items-center gap-3">
              {allOverdueCompleted ? (
                <Check className="w-5 h-5 text-emerald-400" strokeWidth={3} />
              ) : (
                <History className="w-5 h-5 text-rose-300" />
              )}
              <span className={`font-semibold text-[15px] ${allOverdueCompleted ? 'text-emerald-100' : 'text-rose-100'}`}>
                {t('dashboard.overdueSection')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={`size-6 rounded-full p-0 text-background-dark ${allOverdueCompleted ? 'bg-emerald-400 text-background-dark' : 'bg-danger/80 text-background-dark'}`}
                size="sm"
                tone="neutral"
              >
                {overdueTasks.filter(t => t.status !== 'completed').length}
              </Badge>
              {isPendingExpanded ? (
                <ChevronUp className={`w-5 h-5 ${allOverdueCompleted ? 'text-emerald-400' : 'text-rose-300'}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${allOverdueCompleted ? 'text-emerald-400' : 'text-rose-300'}`} />
              )}
            </div>
          </ListRow>
          
          {isPendingExpanded && (
            <div className="mt-4">
              {sortedOverdueTasks.map(renderTask)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
