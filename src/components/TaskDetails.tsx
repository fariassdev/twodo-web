import React, { useState, useEffect } from 'react';
import { getTaskById, completeTask, postponeTask, getLoveNoteForTask, getProfileById, deleteTask, deleteTaskSeries } from '../lib/queries';
import type { Task, LoveNote, Profile } from '../lib/types';

import { useNavigate, useParams } from '@tanstack/react-router';

export default function TaskDetails() {
  const navigate = useNavigate();
  const { taskId } = useParams({ strict: false }) as { taskId: string };
  const [task, setTask] = useState<Task | null>(null);
  const [loveNote, setLoveNote] = useState<LoveNote | null>(null);
  const [assignedProfile, setAssignedProfile] = useState<Profile | null>(null);
  const [lastDoneByProfile, setLastDoneByProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (taskId) loadTask(taskId);
  }, [taskId]);

  async function loadTask(id: string) {
    try {
      const t = await getTaskById(id);
      setTask(t);
      if (t) {
        const [note, assigned, lastDone] = await Promise.all([
          getLoveNoteForTask(t.id),
          t.assigned_to ? getProfileById(t.assigned_to) : Promise.resolve(null),
          t.last_done_by ? getProfileById(t.last_done_by) : Promise.resolve(null),
        ]);
        setLoveNote(note);
        setAssignedProfile(assigned);
        setLastDoneByProfile(lastDone);
      }
    } catch (err) {
      console.error('Load task error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    if (!task || acting) return;
    setActing(true);
    try {
      await completeTask(task.id);
      navigate({ to: '/' });
    } catch (err) {
      console.error('Complete error:', err);
      setActing(false);
    }
  }

  async function handlePostpone() {
    if (!task || acting) return;
    setActing(true);
    try {
      await postponeTask(task.id);
      navigate({ to: '/' });
    } catch (err) {
      console.error('Postpone error:', err);
      setActing(false);
    }
  }

  async function handleDeleteSingle() {
    if (!task) return;
    setActing(true);
    await deleteTask(task.id);
    navigate({ to: '/' });
  }

  async function handleDeleteFollowing() {
    if (!task || !task.recurrence_id) return;
    setActing(true);
    await deleteTaskSeries(task.recurrence_id, task.date || undefined);
    navigate({ to: '/' });
  }

  async function handleDeleteAll() {
    if (!task || !task.recurrence_id) return;
    setActing(true);
    await deleteTaskSeries(task.recurrence_id);
    navigate({ to: '/' });
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    completed: 'Completada',
    postponed: 'Pospuesta',
  };

  const priorityLabels: Record<string, string> = {
    critical: 'Crítica',
    flexible: 'Flexible',
  };

  const frequencyLabels: Record<string, string> = {
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual',
  };

  const assignmentLabels: Record<string, string> = {
    strict_rotation: 'Rotación estricta',
    team_work: 'Trabajo en Equipo',
    individual: 'Individual',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-400">Tarea no encontrada</p>
        <button onClick={() => navigate({ to: '/' })} className="text-primary font-bold">Volver</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-32">
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden flex flex-col pointer-events-auto z-10">
            <div className="p-6 pb-4">
              <h3 className="text-lg font-bold text-slate-100 mb-2">Eliminar evento recurrente</h3>
              <p className="text-slate-400 text-sm">Este evento se repite. ¿Qué quieres eliminar?</p>
            </div>
            <div className="flex flex-col border-t border-slate-700 divide-y divide-slate-700">
              <button onClick={handleDeleteSingle} className="p-4 text-left text-slate-100 hover:bg-slate-700 transition-colors font-medium">Solo este evento</button>
              <button onClick={handleDeleteFollowing} className="p-4 text-left text-slate-100 hover:bg-slate-700 transition-colors font-medium">Este y los siguientes</button>
              <button onClick={handleDeleteAll} className="p-4 text-left text-rose-500 hover:bg-slate-700 transition-colors font-medium">Todos los eventos</button>
              <button onClick={() => setDeleteModalOpen(false)} className="p-4 text-center text-slate-400 hover:bg-slate-700 transition-colors font-medium bg-slate-800/50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {menuOpen && !deleteModalOpen && (
        <div className="fixed inset-0 z-40 flex justify-center">
          <div 
            className="absolute inset-0 bg-background-dark/60 backdrop-blur-[2px]" 
            onClick={() => setMenuOpen(false)}
          />
          <div className="w-full max-w-md relative pointer-events-none">
            <div className="absolute right-4 top-[60px] w-48 bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden flex flex-col py-1 pointer-events-auto z-50">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate({ to: '/task/$taskId/edit', params: { taskId: task.id } });
                }}
                className="flex items-center gap-3 px-4 py-3 text-slate-100 hover:bg-slate-700 transition-colors w-full text-left"
              >
                <span className="material-symbols-outlined text-slate-400">edit</span>
                <span className="font-semibold text-sm">Editar</span>
              </button>
              <div className="h-px bg-slate-700/50 w-full" />
              <button
                onClick={async () => {
                  if (task.recurrence_id) {
                    setMenuOpen(false);
                    setDeleteModalOpen(true);
                  } else if (window.confirm('¿Seguro que quieres eliminar esta tarea?')) {
                    setMenuOpen(false);
                    setActing(true);
                    await deleteTask(task.id);
                    navigate({ to: '/' });
                  }
                }}
                className="flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-slate-700 transition-colors w-full text-left"
              >
                <span className="material-symbols-outlined">delete</span>
                <span className="font-semibold text-sm">Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="flex items-center px-4 py-4 justify-between sticky top-0 bg-background-dark/80 backdrop-blur-md z-10 max-w-md mx-auto w-full">
        <button onClick={() => navigate({ to: '/' })} className="flex size-10 items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
          <span className="material-symbols-outlined text-slate-100">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center">
          {task.type === 'event' ? 'Detalle de Evento' : 'Detalle de Tarea'}
        </h2>
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex size-10 items-center justify-center rounded-full hover:bg-primary/10 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-100">more_vert</span>
        </button>
      </header>

      <main className="flex-1 px-4 max-w-md mx-auto w-full">
        <div className="pt-4 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              task.status === 'completed' ? 'bg-primary/20 text-primary' :
              task.status === 'postponed' ? 'bg-yellow-500/20 text-yellow-500' :
              'bg-primary/20 text-primary'
            }`}>
              {statusLabels[task.status] || task.status}
            </span>
            {assignedProfile && (
              <span className="text-slate-400 text-xs font-medium">Asignada a: {assignedProfile.name}</span>
            )}
          </div>
          {task.date && (
            <p className="text-slate-400 text-sm font-medium mb-1 capitalize">
              {new Date(task.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          <h1 className="text-3xl font-bold leading-tight mb-4">{task.title}</h1>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className={`material-symbols-outlined text-lg ${task.priority === 'critical' ? 'text-rose-500' : 'text-primary'}`}>priority_high</span>
              <span className="text-sm font-medium">{priorityLabels[task.priority]}</span>
            </div>
            {task.is_recurring && task.frequency && (
              <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="material-symbols-outlined text-primary text-lg">repeat</span>
                <span className="text-sm font-medium">{frequencyLabels[task.frequency]}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="material-symbols-outlined text-primary text-lg">
                {task.assignment_type === 'team_work' ? 'groups' : task.assignment_type === 'individual' ? 'person' : 'sync_alt'}
              </span>
              <span className="text-sm font-medium">{assignmentLabels[task.assignment_type]}</span>
            </div>
          </div>

          {task.description && (
            <p className="text-slate-400 mt-4 leading-relaxed">{task.description}</p>
          )}

          {task.location && (
            <div className="flex items-center gap-2 mt-3 text-slate-400">
              <span className="material-symbols-outlined text-primary text-sm">location_on</span>
              <span className="text-sm">{task.location}</span>
            </div>
          )}

          {(task.start_time || task.end_time) && (
            <div className="flex items-center gap-2 mt-2 text-slate-400">
              <span className="material-symbols-outlined text-primary text-sm">schedule</span>
              <span className="text-sm">
                {task.start_time?.slice(0, 5)}h{task.end_time ? ` - ${task.end_time.slice(0, 5)}h` : ''}
              </span>
            </div>
          )}

          {task.status === 'pending' && (
            <div className="flex flex-col gap-3 mt-6 mb-2">
              <button
                onClick={handleComplete}
                disabled={acting}
                className="w-full bg-primary text-background-dark h-12 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                <span className="material-symbols-outlined font-bold">check_circle</span>
                {acting ? 'Procesando...' : 'Marcar como completada'}
              </button>
              <button
                onClick={handlePostpone}
                disabled={acting}
                className="w-full bg-slate-800/50 text-slate-300 h-12 rounded-xl font-bold border border-slate-700 active:scale-[0.98] transition-transform flex items-center justify-center disabled:opacity-50"
              >
                Posponer
              </button>
            </div>
          )}
        </div>

        {loveNote && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary filled-icon">favorite</span>
              <h3 className="text-lg font-bold">Nota de amor</h3>
            </div>
            <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700 italic text-slate-300 leading-relaxed relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <span className="material-symbols-outlined text-8xl">format_quote</span>
              </div>
              "{loveNote.content}"
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Detalles de asignación</h3>
          <div className="bg-slate-800/40 rounded-xl border border-slate-700 divide-y divide-slate-700">
            <div className="p-4 flex justify-between items-center">
              <span className="text-slate-400">Tipo de rotación</span>
              <span className="font-medium">{assignmentLabels[task.assignment_type]}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-slate-400">Última vez hecha por</span>
              <span className="font-medium">{lastDoneByProfile?.name || '—'}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-slate-400">Recompensa actual</span>
              <span className="font-medium text-primary">+{task.points} Puntos</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
