import React, { useState, useEffect } from 'react';
import { getTasksForMonth, getTasksForDate, getProfiles } from '../lib/queries';
import type { Task, Profile } from '../lib/types';

interface CalendarProps {
  key?: React.Key;
  onNavigate: (screen: string, taskId?: string, dateStr?: string) => void;
}

export default function Calendar({ onNavigate }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthTasks, setMonthTasks] = useState<Task[]>([]);
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfiles().then(setProfiles).catch(console.error);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadMonth();
  }, [year, month]);

  useEffect(() => {
    loadDay();
  }, [selectedDate]);

  async function loadMonth() {
    setLoading(true);
    try {
      const tasks = await getTasksForMonth(year, month);
      setMonthTasks(tasks);
    } catch (err) {
      console.error('Load month error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDay() {
    try {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      const tasks = await getTasksForDate(dateStr);
      setDayTasks(tasks);
    } catch (err) {
      console.error('Load day error:', err);
    }
  }

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
  const selectedStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  function formatSelectedDate() {
    const d = selectedDate;
    const day = d.getDate();
    const monthName = monthNames[d.getMonth()];
    const yr = d.getFullYear();
    return `${day} ${monthName} ${yr}`;
  }

  return (
    <div className="pb-24 flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-4 sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md">
        <button className="flex items-center justify-center size-10 rounded-full hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight">Our Calendar</h1>
        <button className="flex items-center justify-center size-10 rounded-full hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>

      <div className="flex items-center justify-between px-6 py-2 max-w-md mx-auto w-full">
        <button onClick={prevMonth} className="p-2 rounded-full hover:bg-slate-800">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <h2 className="text-base font-bold">{monthNames[month]} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-full hover:bg-slate-800">
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <div className="px-4 mb-6 max-w-md mx-auto w-full">
        <div className="grid grid-cols-7 mb-2">
          {['D','L','M','X','J','V','S'].map((d, i) => (
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
                        key={idx}
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

      <div className="flex-1 bg-slate-900/40 rounded-t-xl p-4 shadow-2xl border-t border-slate-800 overflow-y-auto max-w-md mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">{formatSelectedDate()}</h3>
          <button onClick={() => onNavigate('create', undefined, selectedStr)} className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">+ Add Event</button>
        </div>
        <div className="space-y-3">
          {dayTasks.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">No hay eventos para este día</p>
          )}
          {dayTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onNavigate('details', task.id)}
              className="flex items-center gap-4 p-4 bg-slate-800/60 rounded-2xl border border-transparent hover:border-primary/30 transition-all cursor-pointer"
            >
              {/* Status Icon */}
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
                <h4 className="font-bold text-base text-slate-100 truncate mb-0.5">{task.title}</h4>
                <p className="text-sm text-slate-400 truncate flex items-center gap-1">
                  {task.start_time && (
                    <><span className="material-symbols-outlined text-[16px]">schedule</span> {task.start_time.slice(0, 5)}</>
                  )}
                  {task.start_time && task.location && <span className="mx-0.5">•</span>}
                  {task.location && (
                    <span className={task.start_time ? "text-emerald-400" : ""}>{task.location}</span>
                  )}
                </p>
              </div>

              {/* Avatars */}
              <div className="shrink-0 flex -space-x-2">
                {task.assignment_type === 'team_work' ? (
                  profiles.map(p => (
                    <img key={p.id} src={p.avatar_url || ''} className="w-7 h-7 rounded-full border-[1.5px] border-slate-800 bg-slate-700 object-cover" alt={p.name} />
                  ))
                ) : (
                  profiles.filter(p => p.id === task.assigned_to).map(p => (
                    <img key={p.id} src={p.avatar_url || ''} className="w-7 h-7 rounded-full border-[1.5px] border-slate-800 bg-slate-700 object-cover" alt={p.name} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
