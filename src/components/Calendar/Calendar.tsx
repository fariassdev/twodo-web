import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAuthScope,
  usePrefetchMonthTasks,
  useProfilesQuery,
  useTasksForMonthQuery,
} from '../../lib/queryHooks';
import { queryKeys } from '../../lib/queryKeys';
import type { Profile, Task } from '../../lib/types';
import { useTranslation } from 'react-i18next';
import PageHeader from '../ui/PageHeader';
import DataStatusBanner from '../ui/DataStatusBanner';
import QueryErrorState from '../ui/QueryErrorState';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import SectionHeader from '../ui/SectionHeader';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '../../utils';

const TIME_BLOCKS = ['morning', 'afternoon', 'evening', 'anytime'] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

interface FilterItemProps {
  label: string;
  description: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  activeColor: string;
  disabled?: boolean;
  className?: string;
}

function FilterItem({
  label,
  description,
  icon,
  isActive,
  onClick,
  activeColor,
  disabled,
  className,
}: FilterItemProps) {
  return (
    <button
      className={cn(
        'group flex w-full items-start gap-3 px-4 py-3 text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
        isActive ? 'bg-primary/5' : 'hover:bg-hover',
        className
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <div className={cn(
        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
        isActive ? cn('bg-white shadow-sm', activeColor) : 'bg-surface-2/5 text-surface-2/40'
      )}>
        <span className={cn('material-symbols-outlined text-[20px]', isActive && 'filled-icon')}>{icon}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className={cn('text-sm font-bold transition-colors', isActive ? 'text-surface-2' : 'text-surface-2/70')}>
          {label}
        </span>
        <span className="text-[11px] leading-tight text-surface-2/40">
          {description}
        </span>
      </div>
      <div className="ml-auto flex items-center self-center pl-2">
        <div className={cn(
          'h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center',
          isActive ? 'border-primary bg-primary' : 'border-surface-2/20'
        )}>
          {isActive && <span className="material-symbols-outlined text-[14px] font-bold text-white">check</span>}
        </div>
      </div>
    </button>
  );
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
  const [showTasks, setShowTasks] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showDailyTasks, setShowDailyTasks] = useState(false);
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

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const selectedMonthTasksQuery = useTasksForMonthQuery(selectedYear, selectedMonth, showDeleted);

  const monthTasks = monthTasksQuery.data ?? [];
  const selectedMonthTasks = selectedMonthTasksQuery.data ?? [];
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

  const tasksByBlock = useMemo(() => {
    const filtered = selectedMonthTasks
      .filter((task) => task.date === selectedStr)
      .filter((task) => {
        if (task.type === 'task') {
          if (!showTasks) return false;
          if (!showDailyTasks && task.is_recurring && task.frequency === 'daily') return false;
          return true;
        }
        if (task.type === 'event') {
          return showEvents;
        }
        return true;
      });

    const groups: Record<string, Task[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      anytime: [],
    };

    for (const task of filtered) {
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
  }, [selectedMonthTasks, selectedStr, showTasks, showDailyTasks, showEvents]);

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
    setShowTasks(true);
    setShowEvents(true);
    setShowDailyTasks(false);
  }

  function toggleSheetMode() {
    setSheetMode((prev) => (prev === 'collapsed' ? 'expanded' : 'collapsed'));
  }

  const maxSheetHeight = Math.max(320, viewportHeight - 154); // 66px nav + 72px top bar + 16px margin
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

  const addButtonLabel = showEvents && !showTasks ? t('calendar.addEvent') : t('calendar.addTask');
  const emptyDayMessage = t('calendar.emptyFiltered');

  if (hasQueryError && monthTasks.length === 0) {
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
    <div className="flex h-full flex-col overflow-hidden relative bg-background-dark">
      <div ref={calendarRef} className="shrink-0 flex flex-col">
      <PageHeader
        title={t('calendar.title')}
        subtitle={t('nav.calendar')}
        rightMenu={{
          ariaLabel: t('calendar.viewSettings'),
          closeAriaLabel: t('topBar.closeMenu'),
          open: menuOpen,
          onOpenChange: setMenuOpen,
          menuClassName: "w-72",
          items: [],
          children: (
            <div className="flex flex-col gap-1 pb-1">
              <div className="px-4 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-surface-2/30">
                  {t('calendar.viewSettings')}
                </span>
              </div>

              <FilterItem
                activeColor="text-primary"
                description={t('calendar.showTasksDesc')}
                icon="task_alt"
                isActive={showTasks}
                label={t('calendar.showTasks')}
                onClick={() => {
                  const newValue = !showTasks;
                  setShowTasks(newValue);
                  if (!newValue) {
                    setShowDailyTasks(false);
                  }
                }}
              />

              <FilterItem
                activeColor="text-primary/60"
                description={t('calendar.showDailyTasksDesc')}
                disabled={!showTasks}
                icon="cached"
                isActive={showDailyTasks}
                label={t('calendar.showDailyTasks')}
                onClick={() => setShowDailyTasks(!showDailyTasks)}
              />

              <FilterItem
                activeColor="text-surface-2"
                description={t('calendar.showEventsDesc')}
                icon="calendar_today"
                isActive={showEvents}
                label={t('calendar.showEvents')}
                onClick={() => setShowEvents(!showEvents)}
              />

              <div className="mx-4 my-2 h-px bg-border-subtle/50" />

              <FilterItem
                activeColor="text-surface-2/60"
                description={t('calendar.showDeletedDesc')}
                icon="history_toggle_off"
                isActive={showDeleted}
                label={t('calendar.showDeleted')}
                onClick={() => setShowDeleted(!showDeleted)}
              />
            </div>
          ),
        }}
      />

      <div className="flex items-center justify-between px-6 py-2 max-w-md mx-auto w-full">
        <button onClick={prevMonth} className="p-2 rounded-full hover:bg-hover transition-colors">
          <span className="material-symbols-outlined text-surface-2">chevron_left</span>
        </button>
        <h2 className="text-base font-bold">{monthName} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-full hover:bg-hover transition-colors">
          <span className="material-symbols-outlined text-surface-2">chevron_right</span>
        </button>
      </div>

      <div className="px-4 max-w-md mx-auto w-full">
        <DataStatusBanner isOffline={!isOnline} isStale={isStale} isFetching={isFetching} />
      </div>

      <div className="px-4 max-w-md mx-auto w-full">
        <div className="grid grid-cols-7 mb-2">
          {weekdayLabels.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-bold text-surface-2/40 uppercase tracking-widest">{d}</div>
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
                  !cd.isCurrentMonth ? 'text-surface-2/30' :
                  isSelected ? 'bg-primary text-background-dark font-bold shadow-lg shadow-primary/20' :
                  isToday ? 'bg-primary/20 text-primary font-bold' :
                  'hover:bg-hover text-surface-2'
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
            className={`rounded-t-2xl border border-border-subtle bg-surface-1 transition-[height] ${isSheetDragging ? 'duration-75' : 'duration-250'} ease-out`}
            style={{
              height: `${currentSheetHeight}px`,
            }}
          >
            <button
              aria-label={t('calendar.sheetHandleAriaLabel')}
              className="group flex w-full items-center justify-center pt-3 pb-2 touch-none"
              onPointerCancel={resetSheetDragState}
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={handleSheetPointerUp}
              type="button"
            >
              <svg 
                width="64" 
                height="12" 
                viewBox="0 0 64 12" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className={cn(
                  "text-border-subtle group-hover:text-primary transition-all duration-500 ease-in-out",
                  sheetMode === 'collapsed' ? "animate-indicator" : "rotate-180"
                )}
              >
                <path 
                  d="M12 10L32 2L52 10" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              </svg>
            </button>

            <div className="h-[calc(100%-1.5rem)] overflow-y-auto px-4 pb-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-base font-bold">{formatSelectedDate()}</h3>
                <button
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
                  onClick={() => navigate({ to: '/create', search: { date: selectedStr, type: (showEvents && !showTasks) ? 'event' : 'task' } })}
                  type="button"
                >
                  {addButtonLabel}
                </button>
              </div>

              <div className="space-y-6">
                {Object.values(tasksByBlock).every(arr => arr.length === 0) && (
                  <p className="py-4 text-center text-sm text-surface-2/40">{emptyDayMessage}</p>
                )}
                
                {TIME_BLOCKS.map(block => {
                  const blockTasks = tasksByBlock[block];
                  if (!blockTasks || blockTasks.length === 0) return null;

                  return (
                    <div key={block} className="relative">
                      <SectionHeader className="mb-3 flex items-center gap-2 px-0 text-[10px] text-surface-2/60">
                        {t(`dashboard.timeBlocks.${block}`)}
                        <div className="h-[1px] flex-1 bg-primary/20"></div>
                      </SectionHeader>
                      <div className="space-y-3">
                        {blockTasks.map((task) => {
                          const isDeleted = task.deleted_at !== null;
                          return (
                            <div
                              key={task.id}
                              onClick={() => navigate({ to: '/task/$taskId', params: { taskId: task.id } })}
                              className={`flex items-center gap-4 p-4 bg-surface-2/5 rounded-2xl border border-primary/5 hover:border-primary/20 hover:bg-hover transition-all cursor-pointer ${isDeleted ? 'opacity-50 grayscale' : ''}`}
                            >
                              {task.status === 'completed' ? (
                                <div className="w-12 h-12 shrink-0 rounded-2xl bg-success/20 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-success filled-icon text-[28px]">check_circle</span>
                                </div>
                              ) : task.status === 'postponed' ? (
                                <div className="w-12 h-12 shrink-0 rounded-2xl bg-warning/20 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-warning filled-icon text-[28px]">more_horiz</span>
                                </div>
                              ) : (
                                <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/20 flex items-center justify-center">
                                  <div className="w-6 h-6 rounded-full border-[3px] border-primary"></div>
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h4 className={`font-bold text-base text-surface-2 truncate ${isDeleted ? 'line-through' : ''}`}>{task.title}</h4>
                                  {isDeleted && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-500 px-2 rounded-md">{t('calendar.deletedBadge')}</span>
                                  )}
                                </div>
                                <p className="text-sm text-surface-2/60 truncate flex items-center gap-1">
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
                                    <span className={(task.start_time || task.end_time) ? 'text-primary' : ''}>{task.location}</span>
                                  )}
                                </p>
                              </div>

                              <div className="shrink-0 flex -space-x-2">
                                {task.assignment_type === 'team_work' || task.assignment_type === 'anyone' ? (
                                  profiles.map((profile) => (
                                    <img key={profile.id} src={profile.avatar_url || ''} className="w-7 h-7 rounded-full border-2 border-background-dark bg-primary/20 object-cover" alt={profile.name} />
                                  ))
                                ) : (
                                  profiles.filter((profile) => profile.id === task.assigned_to).map((profile) => (
                                    <img key={profile.id} src={profile.avatar_url || ''} className="w-7 h-7 rounded-full border-2 border-background-dark bg-primary/20 object-cover" alt={profile.name} />
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
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
