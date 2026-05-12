import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { addDays } from 'date-fns';
import { Zap } from 'lucide-react';
import { useTasksDashboard } from '../../../api/hooks';
import { useProfilesQuery } from '../../../lib/queryHooks';
import { getLocalDateString } from '../../../utils';
import type { Task } from '../../../models/Task';
import TaskAvatars from '../TaskAvatars';
import ListRow from '../../ui/ListRow';
import Badge from '../../ui/Badge';
import SectionHeader from '../../ui/SectionHeader';

export default function UpcomingTasksWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Fetch dashboard tasks (includes today, tomorrow, and past pending)
  const dashboardTasksQuery = useTasksDashboard();
  const { data: profiles = [] } = useProfilesQuery();

  const tomorrowStr = getLocalDateString(addDays(new Date(), 1));
  const tomorrowTasks = useMemo(() => 
    (dashboardTasksQuery.data ?? []).filter((task) => task.date === tomorrowStr && task.type === 'task'),
    [dashboardTasksQuery.data, tomorrowStr]
  );

  if (dashboardTasksQuery.isPending || tomorrowTasks.length === 0) return null;

  // Group by moment of the day
  const groups: Record<string, Task[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    anytime: [],
  };

  for (const task of tomorrowTasks) {
    const tod = task.time_of_day || 'anytime';
    if (!groups[tod]) groups[tod] = [];
    groups[tod].push(task);
  }

  const moments = ['morning', 'afternoon', 'evening', 'anytime'] as const;

  return (
    <div className="mt-10 mb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-surface-2 pr-2 tracking-tight">
          {t('dashboard.tomorrowTasks')}
        </h2>
      </div>

      <div className="flex flex-col gap-8">
        {moments.map((moment) => {
          const tasks = groups[moment];
          if (tasks.length === 0) return null;

          return (
            <div key={moment} className="flex flex-col gap-3">
              <SectionHeader className="mb-1 flex items-center gap-2 px-0 text-[10px] text-surface-2/60">
                {t(`dashboard.timeBlocks.${moment}`)}
                <div className="h-[1px] flex-1 bg-primary/20"></div>
              </SectionHeader>
              
              <div className="flex flex-col gap-2">
                {tasks.map((task) => {
                  const showSize = task.effort_level === 'L' || task.effort_level === 'XL';
                  const isHighPriority = task.priority === 'high';

                  return (
                    <ListRow
                      as="div"
                      key={task.id}
                      onClick={() => navigate({ to: '/task/$taskId', params: { taskId: task.id }, search: { from: 'dashboard' } })}
                      className="justify-between overflow-hidden p-4 hover:bg-hover transition-colors shadow-sm"
                      interactive
                      variant="default"
                    >
                      <div className="flex items-center gap-4 flex-1 truncate">
                        {/* Placeholder checkbox for visual rhythm */}
                        <div className="w-[22px] h-[22px] rounded-full border-2 border-dashed border-border-subtle/40 shrink-0" />
                        
                        <div className="flex-1 truncate font-semibold text-base text-surface-2 flex items-center gap-2">
                          <span className="truncate">{task.title}</span>
                          {isHighPriority && (
                            <Zap className="w-3.5 h-3.5 text-primary/60 fill-primary/20" />
                          )}
                          {showSize && (
                            <Badge size="xs" tone={task.effort_level === 'XL' ? 'warning' : 'success'} className="opacity-70">
                              {task.effort_level}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div
                        className="flex-shrink-0"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate({ to: '/profile' });
                        }}
                      >
                        <TaskAvatars task={task} profiles={profiles} overlap="-space-x-1.5" className="ml-2" />
                      </div>
                    </ListRow>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
