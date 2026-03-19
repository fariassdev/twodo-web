import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Zap, ChevronDown, ChevronUp, History, CheckCircle2, Check } from 'lucide-react';
import { useTodaysTasksQuery, useOverdueTasksQuery, useCompleteTaskMutation, useProfilesQuery } from '../../lib/queryHooks';
import type { Task } from '../../lib/types';
import TaskAvatars from './TaskAvatars';

const TIME_BLOCKS = ['morning', 'afternoon', 'evening', 'anytime'] as const;

export default function TodayTasksWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const todaysTasksQuery = useTodaysTasksQuery();
  const overdueTasksQuery = useOverdueTasksQuery();
  const completeTaskMutation = useCompleteTaskMutation();
  const { data: profiles = [] } = useProfilesQuery();

  const [isPendingExpanded, setIsPendingExpanded] = useState(false);

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
      await completeTaskMutation.mutateAsync(taskId);
    } catch (err) {
      console.error('Complete error', err);
    }
  };

  const renderTask = (task: Task) => {
    const isCompleted = task.status === 'completed';
    const showSize = task.effort_level === 'L' || task.effort_level === 'XL';
    const isHighPriority = task.priority === 'high';
    const isTeamWork = task.assignment_type === 'team_work' || task.assignment_type === 'anyone';

    return (
      <div
        key={task.id}
        onClick={() => navigate({ to: '/task/$taskId', params: { taskId: task.id } })}
        className={`relative flex items-center gap-4 p-4 rounded-2xl border mb-3 cursor-pointer transition-all ${
          isCompleted ? 'bg-transparent border-transparent opacity-60' : 'bg-[#1c221e] border-white/5 shadow-sm'
        }`}
      >
        {/* Glow left edge for high priority/morning like the design */}
        {!isCompleted && isHighPriority && (
          <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-lg bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
        )}

        <button
          className={`w-[22px] h-[22px] flex items-center justify-center flex-shrink-0 transition-colors ${
            isCompleted ? 'text-emerald-500 bg-transparent' : 'rounded-[6px] border-2 border-[#415047] bg-transparent'
          }`}
          onClick={(e) => {
            if (isCompleted) {
              e.stopPropagation();
            } else {
              handleComplete(e, task.id);
            }
          }}
        >
          {isCompleted && <CheckCircle2 className="w-6 h-6 fill-emerald-500/20" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-base truncate flex items-center gap-3 ${
            isCompleted ? 'line-through text-gray-500' : 'text-white'
          }`}>
            {task.title}
            {isHighPriority && !isCompleted && (
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            )}
            {showSize && !isCompleted && (
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm ${
                task.effort_level === 'XL' ? 'bg-[#3f2a1d] text-amber-500' : 'bg-[#1c362a] text-emerald-400'
              }`}>
                {task.effort_level}
              </span>
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
      </div>
    );
  };

  return (
    <div className="mt-6 mb-8 relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">{t('dashboard.today')}</h2>
      </div>

      {TIME_BLOCKS.map(block => {
        const blockTasks = tasksByBlock[block];
        if (!blockTasks || blockTasks.length === 0) return null;

        return (
          <div key={block} className="mb-6 relative">
            <h3 className="text-[10px] font-bold text-gray-400 mb-3 tracking-widest uppercase flex items-center gap-2">
              {t(`dashboard.timeBlocks.${block}`)}
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </h3>
            <div>
              {blockTasks.map(renderTask)}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && overdueTasks.length === 0 && (
        <div className="text-center p-8 bg-[#1c221e] rounded-3xl border border-dashed border-white/10 text-gray-500">
          {t('dashboard.noTasksFound')}
        </div>
      )}

      {overdueTasks.length > 0 && (
        <div className="mt-8">
          <div 
            onClick={() => setIsPendingExpanded(!isPendingExpanded)}
            className={`rounded-2xl p-4 flex justify-between items-center cursor-pointer transition-all border ${
              allOverdueCompleted 
                ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-100' 
                : 'bg-[#2a1a19] border-red-500/10 text-white/90'
            }`}
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
              <span className={`text-[#2a1a19] text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                allOverdueCompleted ? 'bg-emerald-400' : 'bg-[#bb6156]'
              }`}>
                {overdueTasks.filter(t => t.status !== 'completed').length}
              </span>
              {isPendingExpanded ? (
                <ChevronUp className={`w-5 h-5 ${allOverdueCompleted ? 'text-emerald-400' : 'text-rose-300'}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${allOverdueCompleted ? 'text-emerald-400' : 'text-rose-300'}`} />
              )}
            </div>
          </div>
          
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
