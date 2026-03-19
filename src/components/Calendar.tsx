import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAuthScope,
  usePrefetchMonthTasks,
  useProfilesQuery,
  useTasksForMonthQuery,
} from '../lib/queryHooks';
import { queryKeys } from '../lib/queryKeys';
import type { Profile, Task } from '../lib/types';
import { useTranslation } from 'react-i18next';
import TopBar from './ui/TopBar';
import DataStatusBanner from './ui/DataStatusBanner';
import QueryErrorState from './ui/QueryErrorState';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

import { useNavigate } from '@tanstack/react-router';

type SortOption = 'status' | 'name' | 'assignee';
type TypeFilter = 'all' | 'task' | 'event';

const STATUS_ORDER: Record<'pending' | 'postponed' | 'completed', number> = {
  pending: 0,
  postponed: 1,
  completed: 2,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();
  const isOnline = useOnlineStatus();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = localStorage.getItem('calendarSelectedDate');
    return saved ? new Date(saved) : new Date();
  });
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(() => {
    const saved = localStorage.getItem('calendarTypeFilter');
    return (saved === 'task' || saved === 'event') ? saved : 'all';
  });
  const [sortBy, setSortBy] = useState<SortOption>('status');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sheetMode, setSheetMode] = useState<'collapsed' | 'expanded'>('collapsed');
  const [sheetDragHeight, setSheetDragHeight] = useState<number | null>(null);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const [showDeleted, setShowDeleted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendarHeight, setCalendarHeight] = useState(480);

  const sheetPointerStartYRef = useRef<number | null>(null);
  const sheetPointerDeltaRef = useRef<number>(0);
  const sheetDragStartHeightRef = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem('calendarSelectedDate', selectedDate.toISOString());
  }, [selectedDate]);

  useEffect(() => {
    localStorage.setItem('calendarTypeFilter', typeFilter);
  }, [typeFilter]);

  useEffect(() => {
    const onResize = () => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!calendarRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCalendarHeight(entry.target.getBoundingClientRect().height);
      }
    });
    observer.observe(calendarRef.current);
    return () => observer.disconnect();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const selectedStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

  const profilesQuery = useProfilesQuery();
  const monthTasksQuery = useTasksForMonthQuery(year, month, showDeleted);
  const prefetchMonthTasks = usePrefetchMonthTasks();

  const monthTasks = monthTasksQuery.data ?? [];
  const profiles: Profile[] = profilesQuery.data ?? [];
  const profileNameMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile.name])), [profiles]);
  const hasQueryError =
    monthTasksQuery.isError || profilesQuery.isError;
  const isStale =
    monthTasksQuery.isStale || profilesQuery.isStale;
  const isFetching =
    monthTasksQuery.isFetching || profilesQuery.isFetching;

  function getAssigneeSortLabel(task: Task): string {
    if (task.assignment_type === 'team_work' || task.assignment_type === 'anyone') {
      return t('calendar.assigneeShared');
    }

    if (!task.assigned_to) {
      return t('calendar.assigneeUnassigned');
    }

    return profileNameMap.get(task.assigned_to) ?? t('calendar.assigneeUnassigned');
  }

  const dayEntries = useMemo(() => {
    const filtered = monthTasks
      .filter((task) => task.date === selectedStr)
      .filter((task) => {
        if (typeFilter === 'all') return true;
        return task.type === typeFilter;
      })
      .filter((task) => {
        if (assigneeFilter === 'all') {
          return true;
        }

        if (task.assignment_type === 'team_work' || task.assignment_type === 'anyone') {
          return true;
        }

        return task.assigned_to === assigneeFilter;
      });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'status') {
        const statusDiff =
          (STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] ?? 99) -
          (STATUS_ORDER[b.status as keyof typeof STATUS_ORDER] ?? 99);
        if (statusDiff !== 0) {
          return statusDiff;
        }
      }

      if (sortBy === 'name') {
        return a.title.localeCompare(b.title, i18n.language, { sensitivity: 'base' });
      }

      if (sortBy === 'assignee') {
        const assigneeDiff = getAssigneeSortLabel(a).localeCompare(getAssigneeSortLabel(b), i18n.language, {
          sensitivity: 'base',
        });
        if (assigneeDiff !== 0) {
          return assigneeDiff;
        }
      }

      return a.title.localeCompare(b.title, i18n.language, { sensitivity: 'base' });
    });
  }, [typeFilter, assigneeFilter, i18n.language, monthTasks, profileNameMap, selectedStr, sortBy]);

  useEffect(() => {
    void prefetchMonthTasks(year, month + 1, showDeleted);
    void prefetchMonthTasks(year, month - 1, showDeleted);
  }, [year, month, showDeleted, prefetchMonthTasks]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, daysInPrevMonth - i),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }

  // Next month days to fill grid
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  // Map task dates for dots
  const taskDateMap = new Map<string, string[]>();
  for (const t of monthTasks) {
    if (!t.date) continue;
    const existing = taskDateMap.get(t.date) || [];
    existing.push(t.type);
    taskDateMap.set(t.date, existing);
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const monthName = new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date(year, month, 1));
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.UTC(2024, 0, 7 + i));
    return new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' }).format(date).toUpperCase();
  });

  function formatSelectedDate() {
    return new Intl.DateTimeFormat(i18n.language, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(selectedDate);
  }

  function resetControls() {
    setSortBy('status');
    setTypeFilter('all');
    setAssigneeFilter('all');
  }

  function toggleSheetMode() {
    setSheetMode((prev) => (prev === 'collapsed' ? 'expanded' : 'collapsed'));
  }

  const maxSheetHeight = Math.max(320, viewportHeight - 146); // 66px nav + 72px top bar + 8px margin
  const remainingSpace = viewportHeight - calendarHeight - 66; // 66px bottom nav, no extra gap
  const collapsedHeight = clamp(
    remainingSpace,
    120,
    maxSheetHeight
  );
  const expandedHeight = clamp(
    Math.round(viewportHeight * 0.85),
    collapsedHeight + 60,
    maxSheetHeight
  );
  const currentSheetHeight =
    sheetDragHeight ?? (sheetMode === 'collapsed' ? collapsedHeight : expandedHeight);

  function resetSheetDragState() {
    sheetPointerStartYRef.current = null;
    sheetPointerDeltaRef.current = 0;
    sheetDragStartHeightRef.current = 0;
    setSheetDragHeight(null);
    setIsSheetDragging(false);
  }

  function handleSheetPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    sheetPointerStartYRef.current = event.clientY;
    sheetPointerDeltaRef.current = 0;
    sheetDragStartHeightRef.current = currentSheetHeight;
    setSheetDragHeight(currentSheetHeight);
    setIsSheetDragging(true);
  }

  function handleSheetPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (sheetPointerStartYRef.current === null) {
      return;
    }

    const delta = event.clientY - sheetPointerStartYRef.current;
    sheetPointerDeltaRef.current = delta;
    const nextHeight = clamp(
      sheetDragStartHeightRef.current - delta,
      collapsedHeight,
      expandedHeight,
    );
    setSheetDragHeight(nextHeight);
  }

  function handleSheetPointerUp() {
    if (sheetPointerStartYRef.current === null) {
      return;
    }

    const delta = sheetPointerDeltaRef.current;
    const moved = Math.abs(delta) > 6;
    const draggedHeight = sheetDragHeight ?? currentSheetHeight;
    const midpoint = (collapsedHeight + expandedHeight) / 2;

    if (!moved) {
      toggleSheetMode();
      resetSheetDragState();
      return;
    }

    setSheetMode(draggedHeight >= midpoint ? 'expanded' : 'collapsed');

    resetSheetDragState();
  }

  const hasActiveControls = sortBy !== 'status' || typeFilter !== 'all' || assigneeFilter !== 'all';
  const addButtonLabel = typeFilter === 'event' ? t('calendar.addEvent') : t('calendar.addTask');
  const emptyDayMessage = hasActiveControls
    ? t('calendar.emptyFiltered')
    : t('calendar.emptyDayTask');

  if (hasQueryError && monthTasks.length === 0 && dayEntries.length === 0) {
    return (
      <QueryErrorState
        onRetry={() => {
          if (!householdId) return;

          void Promise.all([
            queryClient.refetchQueries({
              queryKey: queryKeys.calendar.month(year, month, showDeleted, householdId),
            }),
            queryClient.refetchQueries({ queryKey: queryKeys.profiles.list(householdId) }),
          ]);
        }}
      />
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden relative">
      <div ref={calendarRef} className="shrink-0 flex flex-col">
        <TopBar
          title={t('calendar.title')}
        titleIcon="calendar_month"
        rightMenu={{
          ariaLabel: t('topBar.openMenu'),
          closeAriaLabel: t('topBar.closeMenu'),
          open: menuOpen,
          onOpenChange: setMenuOpen,
          items: [
            {
              id: 'toggle-deleted',
              icon: showDeleted ? 'visibility_off' : 'visibility',
              label: showDeleted ? t('calendar.hideDeleted') : t('calendar.showDeleted'),
              onClick: () => setShowDeleted(!showDeleted),
            },
          ],
        }}
      />

      <div className="flex items-center justify-between px-6 py-2 max-w-md mx-auto w-full">
        <button onClick={prevMonth} className="p-2 rounded-full hover:bg-slate-800">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <h2 className="text-base font-bold">{monthName} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-full hover:bg-slate-800">
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <div className="px-4 max-w-md mx-auto w-full">
        <DataStatusBanner isOffline={!isOnline} isStale={isStale} isFetching={isFetching} />
      </div>

      <div className="px-4 max-w-md mx-auto w-full">
        <div className="grid grid-cols-7 mb-2">
          {weekdayLabels.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-2">
          {calendarDays.map((cd, i) => {
            const dateStr = `${cd.date.getFullYear()}-${String(cd.date.getMonth() + 1).padStart(2, '0')}-${String(cd.date.getDate()).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedStr;
            const dots = taskDateMap.get(dateStr);

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(new Date(cd.date))}
                className={`relative h-12 flex flex-col items-center justify-center rounded-xl transition-colors ${
                  !cd.isCurrentMonth ? 'text-slate-700' :
                  isSelected ? 'bg-primary text-background-dark font-bold shadow-lg shadow-primary/20' :
                  isToday ? 'bg-primary/20 text-primary font-bold' :
                  'hover:bg-slate-800'
                }`}
              >
                <span className="text-sm font-medium">{cd.day}</span>
                {dots && dots.length > 0 && cd.isCurrentMonth && (
                  <div className="absolute bottom-1.5 flex items-center gap-0.5">
                    {dots.slice(0, 3).map((type, idx) => (
                      <div
                        key={`${type}-${idx}`}
                        className={`size-1 rounded-full ${isSelected ? 'bg-background-dark' : type === 'task' ? 'bg-[var(--color-dot-task)]' : 'bg-[var(--color-dot-event)]'}`}
                      ></div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      </div>

      <div className="fixed inset-x-0 bottom-[66px] z-20 pointer-events-none">
        <div className="mx-auto w-full max-w-md pointer-events-auto">
          <div
            className={`rounded-t-2xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-sm transition-[height] ${isSheetDragging ? 'duration-75' : 'duration-250'} ease-out`}
            style={{
              height: `${currentSheetHeight}px`,
            }}
          >
            <button
              aria-label={t('calendar.sheetHandleAriaLabel')}
              className="group flex w-full items-center justify-center pt-2 pb-1 touch-none"
              onPointerCancel={resetSheetDragState}
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={handleSheetPointerUp}
              type="button"
            >
              <span className="h-1.5 w-12 rounded-full bg-slate-600 transition-colors group-hover:bg-slate-500" />
            </button>

            <div className="h-[calc(100%-1.5rem)] overflow-y-auto px-4 pb-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-base font-bold">{formatSelectedDate()}</h3>
                <button
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
                  onClick={() => navigate({ to: '/create', search: { date: selectedStr, type: typeFilter === 'event' ? 'event' : 'task' } })}
                  type="button"
                >
                  {addButtonLabel}
                </button>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('calendar.sortBy')}</span>
                  <select
                    className="h-9 rounded-lg border border-slate-700 bg-slate-800 px-2 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                    onChange={(event) => setSortBy(event.target.value as SortOption)}
                    value={sortBy}
                  >
                    <option value="status">{t('calendar.sortStatus')}</option>
                    <option value="name">{t('calendar.sortName')}</option>
                    <option value="assignee">{t('calendar.sortAssignee')}</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('calendar.filterType', 'Tipo')}</span>
                  <select
                    className="h-9 rounded-lg border border-slate-700 bg-slate-800 px-2 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                    onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
                    value={typeFilter}
                  >
                    <option value="all">{t('calendar.typeAll', 'Todos')}</option>
                    <option value="task">{t('entryForm.typeTask')}</option>
                    <option value="event">{t('entryForm.typeEvent')}</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('calendar.filterAssignee')}</span>
                  <select
                    className="h-9 rounded-lg border border-slate-700 bg-slate-800 px-2 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                    onChange={(event) => setAssigneeFilter(event.target.value)}
                    value={assigneeFilter}
                  >
                    <option value="all">{t('calendar.assigneeAll')}</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {hasActiveControls && (
                <div className="mb-3 flex justify-end">
                  <button
                    className="rounded-full border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary"
                    onClick={resetControls}
                    type="button"
                  >
                    {t('calendar.clearFilters')}
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {dayEntries.length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-500">{emptyDayMessage}</p>
                )}
                {dayEntries.map((task) => {
                  const isDeleted = task.deleted_at !== null;
                  return (
                    <div
                      key={task.id}
                      onClick={() => navigate({ to: '/task/$taskId', params: { taskId: task.id } })}
                      className={`flex items-center gap-4 p-4 bg-slate-800/60 rounded-2xl border border-transparent hover:border-primary/30 transition-all cursor-pointer ${isDeleted ? 'opacity-50 grayscale' : ''}`}
                    >
                      {task.status === 'completed' ? (
                        <div className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-emerald-500 filled-icon text-[28px]">check_circle</span>
                        </div>
                      ) : task.status === 'postponed' ? (
                        <div className="w-12 h-12 shrink-0 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-orange-500 filled-icon text-[28px]">more_horiz</span>
                        </div>
                      ) : (
                        <div className="w-12 h-12 shrink-0 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full border-[3px] border-blue-400"></div>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className={`font-bold text-base text-slate-100 truncate ${isDeleted ? 'line-through' : ''}`}>{task.title}</h4>
                          {isDeleted && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-500 px-2 rounded-md">{t('calendar.deletedBadge')}</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 truncate flex items-center gap-1">
                          {(task.start_time || task.end_time) && (
                            <>
                              <span className="material-symbols-outlined text-[16px]">schedule</span>{' '}
                              <span>
                                {task.start_time?.slice(0, 5)}{t('common.hourSuffix')}
                                {task.end_time ? ` - ${task.end_time.slice(0, 5)}${t('common.hourSuffix')}` : ''}
                              </span>
                            </>
                          )}
                          {(task.start_time || task.end_time) && task.location && <span className="mx-0.5">•</span>}
                          {task.location && (
                            <span className={(task.start_time || task.end_time) ? 'text-emerald-400' : ''}>{task.location}</span>
                          )}
                        </p>
                      </div>

                      <div className="shrink-0 flex -space-x-2">
                        {task.assignment_type === 'team_work' || task.assignment_type === 'anyone' ? (
                          profiles.map((profile) => (
                            <img key={profile.id} src={profile.avatar_url || ''} className="w-7 h-7 rounded-full border-[1.5px] border-slate-800 bg-slate-700 object-cover" alt={profile.name} />
                          ))
                        ) : (
                          profiles.filter((profile) => profile.id === task.assigned_to).map((profile) => (
                            <img key={profile.id} src={profile.avatar_url || ''} className="w-7 h-7 rounded-full border-[1.5px] border-slate-800 bg-slate-700 object-cover" alt={profile.name} />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
