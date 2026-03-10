import React, { useState } from 'react';
import {
  useCompleteTaskMutation,
  useLatestLoveNoteQuery,
  useProfileQuery,
  useTodaysTasksQuery,
  useUpcomingEventsQuery,
} from '../lib/queryHooks';
import { getActiveProfileId } from '../lib/supabase';
import type { Task } from '../lib/types';
import { useTranslation } from 'react-i18next';
import TopBar from './ui/TopBar';

import { useNavigate } from '@tanstack/react-router';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const todaysTasksQuery = useTodaysTasksQuery();
  const upcomingEventsQuery = useUpcomingEventsQuery();
  const latestLoveNoteQuery = useLatestLoveNoteQuery();
  const profileQuery = useProfileQuery(getActiveProfileId());
  const completeTaskMutation = useCompleteTaskMutation();

  const tasks = todaysTasksQuery.data ?? [];
  const events = upcomingEventsQuery.data ?? [];
  const loveNote = latestLoveNoteQuery.data ?? null;
  const profile = profileQuery.data ?? null;
  const loading =
    todaysTasksQuery.isPending ||
    upcomingEventsQuery.isPending ||
    latestLoveNoteQuery.isPending ||
    profileQuery.isPending;

  async function handleComplete(e: React.MouseEvent, taskId: string) {
    e.stopPropagation();
    try {
      await completeTaskMutation.mutateAsync(taskId);
    } catch (err) {
      console.error('Complete error:', err);
    }
  }

  const pendingCount = tasks.length;

  const filteredTasks = search
    ? tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks;
  const filteredEvents = search
    ? events.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    : events;

  function formatEventDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    const month = d.toLocaleString(i18n.language, { month: 'short' });
    const day = String(d.getDate()).padStart(2, '0');
    return { month: month.charAt(0).toUpperCase() + month.slice(1), day };
  }

  function getTaskIcon(task: Task) {
    if (task.location?.toLowerCase().includes('mercadona') || task.title.toLowerCase().includes('compra')) return 'shopping_cart';
    if (task.title.toLowerCase().includes('limpi') || task.title.toLowerCase().includes('cocina')) return 'cleaning_services';
    if (task.title.toLowerCase().includes('basura')) return 'delete';
    if (task.title.toLowerCase().includes('planch')) return 'iron';
    return 'check_circle';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <TopBar
        title={t('dashboard.title')}
        titleIcon="grid_view"
        rightSlot={(
          <button
            aria-label={t('topBar.openProfile')}
            className="flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary/20 transition-colors hover:border-primary/80"
            onClick={() => navigate({ to: '/profile' })}
            type="button"
          >
            {profile?.avatar_url ? (
              <img alt={t('profile.title')} className="h-full w-full object-cover" src={profile.avatar_url} />
            ) : (
              <span className="material-symbols-outlined text-primary">person</span>
            )}
          </button>
        )}
      />

      <main className="max-w-md mx-auto px-4 pt-6">
        <div className="relative mb-8">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            className="w-full pl-10 pr-4 py-3 bg-primary/5 border border-primary/20 rounded-xl focus:ring-primary focus:border-primary text-slate-100 placeholder:text-slate-500"
            placeholder={t('dashboard.searchPlaceholder')}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[22px] font-bold tracking-tight">{t('dashboard.todayMissions')}</h2>
            <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-lg uppercase tracking-wider">
              {t('dashboard.pendingCount', { count: pendingCount })}
            </span>
          </div>
          <div className="space-y-3">
            {filteredTasks.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">
                {search ? t('dashboard.noTasksFound') : t('dashboard.allDoneToday')}
              </p>
            )}
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10 shadow-sm cursor-pointer"
                onClick={() => navigate({ to: '/task/$taskId', params: { taskId: task.id } })}
              >
                <div className="flex-shrink-0">
                  <input
                    className="h-6 w-6 rounded-lg border-2 border-primary/30 bg-transparent text-primary focus:ring-primary"
                    type="checkbox"
                    onClick={(e) => handleComplete(e, task.id)}
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base leading-tight">{task.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 font-bold rounded uppercase ${
                      task.priority === 'critical'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-primary/20 text-primary'
                    }`}>
                      {task.priority === 'critical' ? t('entryForm.priorityCritical') : t('entryForm.priorityFlexible')}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{task.location || task.description || ''}</p>
                </div>
                <div className="flex-shrink-0 text-primary">
                  <span className="material-symbols-outlined">{getTaskIcon(task)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {loveNote && (
          <section className="mb-8">
            <div className="bg-yellow-500/10 p-5 rounded-2xl border border-yellow-500/20 shadow-sm relative overflow-hidden">
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-6xl text-yellow-500/10 rotate-12">favorite</span>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-yellow-400 filled-icon">favorite</span>
                  </div>
                </div>
                <div className="flex-grow">
                  <h2 className="text-sm font-bold text-yellow-200 uppercase tracking-wider mb-1">{t('dashboard.loveNoteTitle')}</h2>
                  <p className="text-slate-300 italic font-medium leading-relaxed">
                    "{loveNote.content}"
                  </p>
                  <div className="mt-3 flex justify-end">
                    <button className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>{t('dashboard.reply')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[22px] font-bold tracking-tight text-slate-100">{t('dashboard.sharedPlans')}</h2>
            <button className="text-primary font-bold text-sm" onClick={() => navigate({ to: '/calendar' })}>{t('dashboard.viewCalendar')}</button>
          </div>
          <div className="space-y-4">
            {filteredEvents.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">{t('dashboard.noUpcomingEvents')}</p>
            )}
            {filteredEvents.map((event) => {
              const { month, day } = event.date ? formatEventDate(event.date) : { month: t('dashboard.noDateMonth'), day: t('dashboard.noDateDay') };
              return (
                <div
                  key={event.id}
                  className="bg-primary/5 rounded-2xl border border-primary/10 shadow-md p-4 flex gap-4 cursor-pointer"
                  onClick={() => navigate({ to: '/task/$taskId', params: { taskId: event.id } })}
                >
                  <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-xl flex flex-col items-center justify-center text-primary border border-primary/20">
                    <span className="text-xs font-bold uppercase">{month}</span>
                    <span className="text-2xl font-black">{day}</span>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base font-bold">{event.title}</h3>
                      <span className="material-symbols-outlined text-primary text-sm">celebration</span>
                    </div>
                    {event.location && (
                      <p className="text-slate-400 text-sm mb-1">{event.location}</p>
                    )}
                    {(event.start_time || event.end_time) && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                        <span className="text-xs font-medium text-slate-400">
                          {event.start_time?.slice(0, 5)}{t('common.hourSuffix')}{event.end_time ? ` - ${event.end_time.slice(0, 5)}${t('common.hourSuffix')}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 self-center">
                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
