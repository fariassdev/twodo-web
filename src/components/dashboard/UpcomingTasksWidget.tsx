import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useUpcomingTasksQuery, useProfilesQuery } from '../../lib/queryHooks';
import type { Task } from '../../lib/types';
import TaskAvatars from './TaskAvatars';

export default function UpcomingTasksWidget() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: upcomingTasks = [], isPending } = useUpcomingTasksQuery(7);
  const { data: profiles = [] } = useProfilesQuery();

  if (isPending || upcomingTasks.length === 0) return null;

  // Group by date
  const groups: Record<string, Task[]> = {};
  for (const task of upcomingTasks) {
    const d = task.date || 'unknown';
    if (!groups[d]) groups[d] = [];
    groups[d].push(task);
  }

  const sortedDates = Object.keys(groups).sort();

  const formatDate = (dateStr: string) => {
    if (dateStr === 'unknown') return { dow: '', day: '' };
    const d = new Date(dateStr + 'T00:00:00');
    const dow = d.toLocaleDateString(i18n.language, { weekday: 'short' }).slice(0, 3).toUpperCase();
    const day = d.getDate();
    return { dow, day };
  };

  return (
    <div className="mt-8 mb-24">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white pr-2 tracking-tight">{t('dashboard.upcomingTasks')}</h2>
      </div>

      <div className="flex flex-col gap-2">
        {sortedDates.map((date) => {
          const { dow, day } = formatDate(date);

          return groups[date].map((task) => (
            <div
              key={task.id}
              onClick={() => navigate({ to: '/task/$taskId', params: { taskId: task.id } })}
              className="bg-[#1c221e] rounded-2xl border border-white/5 overflow-hidden flex items-center justify-between p-4 cursor-pointer hover:bg-[#1a201c] transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 truncate">
                <div className="flex flex-col items-center justify-center min-w-[36px]">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{dow}</span>
                  <span className="text-xl font-bold text-white leading-none mt-0.5">{day}</span>
                </div>
                <div className="flex-1 truncate font-semibold text-white text-[15px]">
                  {task.title}
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
            </div>
          ));
        })}
      </div>
    </div>
  );
}
