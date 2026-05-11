import React, { useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Zap, ChevronDown, ChevronUp, History, CheckCircle2, Check } from 'lucide-react';
import { useTodaysTasksQuery, useOverdueTasksQuery, useTaskCountQuery, useCompleteTaskMutation, useProfilesQuery, useAuthScope } from '../../../lib/queryHooks';
import type { Task } from '../../../lib/types';
import TaskAvatars from '../TaskAvatars';
import EmptyTodayState from './EmptyTodayState';
import { toast } from '../../ui/Snackbar';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import ListRow from '../../ui/ListRow';
import SectionHeader from '../../ui/SectionHeader';
import { getLocalDateString } from '../../../utils';

const TIME_BLOCKS = ['morning', 'afternoon', 'evening', 'anytime'] as const;

export default function TodayTasksWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const todaysTasksQuery = useTodaysTasksQuery();
  const overdueTasksQuery = useOverdueTasksQuery();
  const taskCountQuery = useTaskCountQuery();
  const completeTaskMutation = useCompleteTaskMutation();
  const { profileId } = useAuthScope();
  const { data: profiles = [] } = useProfilesQuery();

  const [isPendingExpanded, setIsPendingExpanded] = useState(false);
  const [lastCompletedTask, setLastCompletedTask] = useState<Task | null>(null);

  const tasks = todaysTasksQuery.data ?? [];
  const allOverdueTasks = overdueTasksQuery.data ?? [];

  const overdueTasks = useMemo(() => {
    const sevenDaysAgo = getLocalDateString(subDays(new Date(), 7));
    return allOverdueTasks.filter(task => task.date && task.date >= sevenDaysAgo);
  }, [allOverdueTasks]);

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
      const task = tasks.find((t) => t.id === taskId) ?? allOverdueTasks.find((t) => t.id === taskId);
      
      // If it's an individual task assigned to someone else, go to assignment screen
      if (task && (task.assignment_type === 'individual' || task.assignment_type === 'strict_rotation') && task.assigned_to !== profileId) {
        navigate({
          to: '/task/$taskId/assignment',
          params: { taskId },
        });
        return;
      }

      await completeTaskMutation.mutateAsync({ taskId });
      const completedTask = task ?? null;
      setLastCompletedTask(completedTask);
      
      const assignmentText =
        completedTask?.assignment_type === 'team_work'
          ? t('taskCompletion.teamWork')
          : completedTask?.assignment_type === 'individual' || completedTask?.assignment_type === 'strict_rotation'
            ? t('taskCompletion.individual')
            : t('taskCompletion.anyone');

      toast.success(`${t('taskCompletion.completed')}. ${t('taskCompletion.pointsAssignedTo')} ${assignmentText}`, {
        action: {
          label: t('taskCompletion.change'),
          onClick: () => {
            if (!completedTask) return;
            navigate({
              to: '/task/$taskId/assignment',
              params: { taskId: completedTask.id },
            });
          },
        },
      });
    } catch (err) {
      console.error('Complete error', err);
    }
  };


  const renderTask = (task: Task) => {
    const isCompleted = task.status === 'completed';
    const showSize = task.effort_level === 'L' || task.effort_level === 'XL';
    const isHighPriority = task.priority === 'high';
    const isTeamWork = task.assignment_type === 'team_work';

    return (
      <ListRow
        as="div"
        completed={isCompleted}
        key={task.id}
        onClick={() => navigate({ to: '/task/$taskId', params: { taskId: task.id }, search: { from: 'dashboard' } })}
        className="mb-3 shadow-sm"
        interactive
      >
        {/* Glow left edge for high priority/morning like the design */}
        {!isCompleted && isHighPriority && (
          <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-lg bg-primary shadow-[0_0_8px_rgba(207,116,85,0.6)]"></div>
        )}

        <Button
          className={`h-[22px] w-[22px] shrink-0 p-0 transition-colors ${
            isCompleted
              ? 'rounded-full text-primary hover:bg-transparent'
              : 'rounded-full border-2 border-border-subtle text-transparent hover:bg-transparent'
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
          {isCompleted && <CheckCircle2 className="w-6 h-6 fill-primary/20" />}
        </Button>

        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-base truncate flex items-center gap-3 ${
            isCompleted ? 'line-through opacity-40' : ''
          }`}>
            {task.title}
            {isHighPriority && !isCompleted && (
              <Zap className="w-4 h-4 text-primary fill-primary" />
            )}
            {showSize && !isCompleted && (
              <Badge size="xs" tone={task.effort_level === 'XL' ? 'warning' : 'success'}>
                {task.effort_level}
              </Badge>
            )}
          </div>
          {isCompleted && (
            <div className="text-xs text-primary/80 mt-1 font-medium italic">
              {isTeamWork 
                ? t('dashboard.completedByBoth') 
                : t('dashboard.completedBy', { name: task.assigned_profile?.name || t('common.partnerFallback') })
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
    <div className="mt-2 relative">


      {TIME_BLOCKS.map(block => {
        const blockTasks = tasksByBlock[block];
        if (!blockTasks || blockTasks.length === 0) return null;

        return (
          <div key={block} className="mb-6 relative">
            <SectionHeader className="mb-3 flex items-center gap-2 px-0 text-[10px] text-surface-2/60">
              {t(`dashboard.timeBlocks.${block}`)}
              <div className="h-[1px] flex-1 bg-primary/20"></div>
            </SectionHeader>
            <div>
              {blockTasks.map(renderTask)}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && (
        <EmptyTodayState 
          isOnboarding={taskCountQuery.data === 0}
          onAddClick={() => navigate({ to: '/create' })}
          onPlanClick={() => navigate({ to: '/calendar' })}
          compact={overdueTasks.length > 0}
        />
      )}

      {overdueTasks.length > 0 && (
        <div className="mt-4">
          <ListRow
            as="div"
            onClick={() => setIsPendingExpanded(!isPendingExpanded)}
            className="justify-between"
            interactive
            variant={allOverdueCompleted ? 'success' : 'alert'}
          >
            <div className="flex items-center gap-3">
              {allOverdueCompleted ? (
                <Check className="w-5 h-5 text-primary" strokeWidth={3} />
              ) : (
                <History className="w-5 h-5 text-danger" />
              )}
              <span className={`font-semibold text-[15px] ${allOverdueCompleted ? 'text-primary' : 'text-danger'}`}>
                {t('dashboard.overdueSection')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={`size-6 rounded-full p-0 text-surface-1 ${allOverdueCompleted ? 'bg-primary text-surface-1' : 'bg-danger/80 text-surface-1'}`}
                size="sm"
                tone="neutral"
              >
                {overdueTasks.filter(t => t.status !== 'completed').length}
              </Badge>
              {isPendingExpanded ? (
                <ChevronUp className={`w-5 h-5 ${allOverdueCompleted ? 'text-primary' : 'text-danger'}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${allOverdueCompleted ? 'text-primary' : 'text-danger'}`} />
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
