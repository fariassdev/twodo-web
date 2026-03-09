import React, { useState, useEffect } from 'react';
import { getTaskById, updateTask } from '../lib/queries';
import type { UpdateTaskInput } from '../lib/queries';

import { useNavigate, useParams, useRouter } from '@tanstack/react-router';

export default function EditEntry() {
  const navigate = useNavigate();
  const router = useRouter();
  const { taskId } = useParams({ strict: false }) as { taskId: string };
  
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [points, setPoints] = useState(10);
  const [priority, setPriority] = useState<'critical' | 'flexible'>('critical');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | null>(null);
  const [type, setType] = useState<'task' | 'event'>('task');
  const [assignmentType, setAssignmentType] = useState<'strict_rotation' | 'team_work' | 'individual'>('strict_rotation');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (taskId) {
      getTaskById(taskId).then(task => {
        if (task) {
          setTitle(task.title);
          setDate(task.date || '');
          setPoints(task.points || 0);
          setPriority(task.priority);
          setIsRecurring(task.is_recurring);
          setFrequency(task.frequency);
          setType(task.type);
          setAssignmentType(task.assignment_type);
          setDescription(task.description || '');
          setLocation(task.location || '');
        }
        setLoading(false);
      });
    }
  }, [taskId]);

  async function handleSave() {
    if (!title.trim() || !taskId) return;
    setSaving(true);
    try {
      const input: UpdateTaskInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        date: date || undefined,
        points,
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : null,
        assignment_type: assignmentType,
        location: location.trim() || undefined,
      };
      await updateTask(taskId, input);
      navigate({ to: '/task/$taskId', params: { taskId } });
    } catch (err) {
      console.error('Update task error:', err);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-dark">
      <div className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-background-dark z-10 max-w-md mx-auto w-full">
        <div onClick={() => router.history.back()} className="text-slate-100 flex size-12 shrink-0 items-center justify-start cursor-pointer">
          <span className="material-symbols-outlined">close</span>
        </div>
        <h2 className="text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Editar Tarea</h2>
        <div onClick={handleSave} className="flex w-12 items-center justify-end cursor-pointer">
          <p className={`text-base font-bold leading-normal tracking-[0.015em] shrink-0 ${saving ? 'text-primary/40' : 'text-primary'}`}>
            {saving ? '...' : 'Save'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-4 py-4 max-w-md mx-auto w-full">
        <label className="flex flex-col w-full">
          <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">Plan Name</p>
          <input
            className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 placeholder:text-primary/40 p-4 text-base font-normal leading-normal"
            placeholder="e.g., Grocery Shopping"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">Date</p>
            <input
              className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 p-4 text-base font-normal"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col">
            <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">Puntos</p>
            <input
              className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 p-4 text-base font-normal"
              placeholder="50"
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value) || 0)}
            />
          </label>
        </div>

        <label className="flex flex-col w-full">
          <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">Location</p>
          <input
            className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 placeholder:text-primary/40 p-4 text-base font-normal leading-normal"
            placeholder="e.g., Mercadona, Casa..."
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-3">
          <p className="text-slate-100 text-sm font-semibold leading-normal">Priority</p>
          <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${priority === 'critical' ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
              <span className="truncate">Critical</span>
              <input className="invisible w-0" name="priority" type="radio" value="critical" checked={priority === 'critical'} onChange={() => setPriority('critical')} />
            </label>
            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${priority === 'flexible' ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
              <span className="truncate">Flexible</span>
              <input className="invisible w-0" name="priority" type="radio" value="flexible" checked={priority === 'flexible'} onChange={() => setPriority('flexible')} />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-slate-100 text-base font-bold leading-tight">Recurring</p>
              <p className="text-primary/60 text-sm font-normal leading-normal">Repeat this task automatically</p>
            </div>
            <label className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-all duration-200 ${isRecurring ? 'justify-end bg-primary' : 'bg-primary/20'}`}>
              <div className="h-full w-[27px] rounded-full bg-white shadow-md"></div>
              <input className="invisible absolute" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
            </label>
          </div>
          {isRecurring && (
            <div className="mt-2">
              <p className="text-slate-100 text-sm font-semibold leading-normal pb-3">Frequency</p>
              <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
                {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                  <label key={f} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${frequency === f ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
                    <span className="truncate capitalize">{f}</span>
                    <input className="invisible w-0" name="frequency" type="radio" value={f} checked={frequency === f} onChange={() => setFrequency(f)} />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 mb-1">
          <p className="text-slate-100 text-sm font-semibold leading-normal">Type</p>
          <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${type === 'task' ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="truncate">Task</span>
              </div>
              <input className="invisible w-0" name="entry_type" type="radio" value="task" checked={type === 'task'} onChange={() => setType('task')} />
            </label>
            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${type === 'event' ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                <span className="truncate">Event</span>
              </div>
              <input className="invisible w-0" name="entry_type" type="radio" value="event" checked={type === 'event'} onChange={() => setType('event')} />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-slate-100 text-sm font-semibold leading-normal">Assignment Type</p>
          <div className="grid grid-cols-1 gap-3">
            {([
              { value: 'strict_rotation', label: 'Strict Rotation', desc: 'Alternate turns every cycle' },
              { value: 'team_work', label: 'Team Work', desc: 'Collaborate together' },
              { value: 'individual', label: 'Individual', desc: 'Assign to one person' },
            ] as const).map((opt) => (
              <label key={opt.value} className={`flex items-center gap-3 p-4 rounded-xl border bg-primary/5 cursor-pointer transition-all ${assignmentType === opt.value ? 'border-primary' : 'border-primary/20'}`}>
                <input
                  className="w-5 h-5 text-primary focus:ring-primary border-primary/40 bg-transparent"
                  name="assignment"
                  type="radio"
                  checked={assignmentType === opt.value}
                  onChange={() => setAssignmentType(opt.value)}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{opt.label}</span>
                  <span className="text-xs text-primary/60">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col w-full pb-8">
          <div className="flex items-center gap-2 pb-2">
            <span className="material-symbols-outlined text-primary text-sm">description</span>
            <p className="text-slate-100 text-sm font-semibold leading-normal">Description</p>
          </div>
          <textarea
            className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-32 placeholder:text-primary/40 p-4 text-base font-normal leading-normal resize-none"
            placeholder="Add specific instructions or a description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
