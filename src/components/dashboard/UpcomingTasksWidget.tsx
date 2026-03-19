import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useUpcomingTasksQuery, useProfilesQuery } from '../../lib/queryHooks';
import type { Profile, Task } from '../../lib/types';

export default function UpcomingTasksWidget() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: upcomingTasks = [], isPending } = useUpcomingTasksQuery(7);
  const { data: profiles = [] } = useProfilesQuery();

  if (isPending || upcomingTasks.length === 0) return null;

  // Render avatars similar to today's widget
  const renderAvatars = (task: Task) => {
    let avatarsToShow: Profile[] = [];
    if (task.assignment_type === 'anyone' || task.assignment_type === 'shared' || !task.assigned_profile) {
      avatarsToShow = profiles.slice(0, 2);
    } else if (task.assigned_profile) {
      avatarsToShow = [task.assigned_profile];
    }
    
    if (avatarsToShow.length === 0) return null;
    
    return (
      <div className="flex -space-x-1.5 ml-2">
        {avatarsToShow.map((p, i) => (
          <div key={p.id} className={`w-7 h-7 rounded-full overflow-hidden flex flex-shrink-0 items-center justify-center bg-[#232b27] border-2 border-[#1c221e] z-${10 - i}`}>
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-emerald-400 font-bold">
                {p.name?.charAt(0).toUpperCase() || '?'}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Group by date
  const groups: Record<string, Task[]> = {};
  for (const task of upcomingTasks) {
    const d = task.date || 'unknown';
    if (!groups[d]) groups[d] = [];
    groups[d].push(task);
  }

  const sortedDates = Object.keys(groups).sort();

  const formatDate = (dateStr: string) => {
    if (dateStr === 'unknown') return '';
    const d = new Date(dateStr + 'T00:00:00');
    const dow = d.toLocaleDateString(i18n.language, { weekday: 'short' }).slice(0, 3).toUpperCase();
    const day = d.getDate();
    return { dow, day };
  };

  return (
    <div className="mt-8 mb-24">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white pr-2 tracking-tight">Próximos 7 días</h2>
      </div>

      <div className="flex flex-col gap-2">
        {sortedDates.map((date) => {
          const { dow, day } = formatDate(date) as { dow: string, day: number };

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
                {renderAvatars(task)}
              </div>
            </div>
          ));
        })}
      </div>
    </div>
  );
}
