import React from 'react';
import type { Task, Profile } from '../../../lib/types';

interface TaskAvatarsProps {
  task: Task;
  profiles: Profile[];
  className?: string;
  overlap?: string;
}

export default function TaskAvatars({ task, profiles, className = "ml-3", overlap = "-space-x-2" }: Readonly<TaskAvatarsProps>) {
  const isCompleted = task.status === 'completed';
  let avatarsToShow: Profile[] = [];

  if (isCompleted) {
    // If team work or anyone, show both members if they exist
    if (task.assignment_type === 'team_work' || task.assignment_type === 'anyone') {
      avatarsToShow = profiles.slice(0, 2);
    } else if (task.last_done_by_profile) {
      // Single person completion
      avatarsToShow = [task.last_done_by_profile];
    }
  } else if (task.assignment_type === 'team_work' || task.assignment_type === 'anyone' || !task.assigned_profile) {
    // Pending tasks: show assigned profiles or both if unassigned / team / anyone
    avatarsToShow = profiles.slice(0, 2);
  } else if (task.assigned_profile) {
    avatarsToShow = [task.assigned_profile];
  }

  if (avatarsToShow.length === 0) return null;

  return (
    <div className={`flex ${overlap} ${className}`}>
      {avatarsToShow.map((p, i) => (
        <div 
          key={p.id} 
          className={`w-7 h-7 rounded-full overflow-hidden flex flex-shrink-0 items-center justify-center bg-primary/20 border-2 border-background-dark transition-all z-${10 - i}`}
        >
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="w-full h-full object-cover shadow-sm" />
          ) : (
            <span className="text-[10px] text-primary font-bold">
              {p.name?.charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
