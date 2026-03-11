import React, { useState, useEffect } from 'react';
import {
  useCreateTasksMutation,
  useDeleteTasksAfterMutation,
  useProfilesQuery,
  useTaskByIdQuery,
  useUpdateTaskMutation,
} from '../lib/queryHooks';
import type { UpdateTaskInput, CreateTaskInput } from '../lib/queries';
import type { Task, Profile } from '../lib/types';
import { useTranslation } from 'react-i18next';
import TopBar from './ui/TopBar';

import { useNavigate, useParams, useRouter } from '@tanstack/react-router';

export default function EditEntry() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const { taskId } = useParams({ strict: false }) as { taskId: string };
  
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [points, setPoints] = useState(10);
  const [priority, setPriority] = useState<'critical' | 'flexible'>('critical');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | null>(null);
  const [type, setType] = useState<'task' | 'event'>('task');
  const [assignmentCategory, setAssignmentCategory] = useState<'team_work' | 'anyone' | 'individual'>('team_work');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [isRotating, setIsRotating] = useState(false);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const profilesQuery = useProfilesQuery();
  const taskQuery = useTaskByIdQuery(taskId);
  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTasksAfterMutation = useDeleteTasksAfterMutation();
  const createTasksMutation = useCreateTasksMutation();

  const profiles: Profile[] = profilesQuery.data ?? [];
  const saving =
    updateTaskMutation.isPending ||
    deleteTasksAfterMutation.isPending ||
    createTasksMutation.isPending;
  const loading = profilesQuery.isPending || taskQuery.isPending;

  useEffect(() => {
    if (profiles.length > 0 && !assignedTo && assignmentCategory === 'individual') {
      setAssignedTo(profiles[0].id);
    }
  }, [profiles, assignedTo, assignmentCategory]);

  const [originalTask, setOriginalTask] = useState<Task | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    const task = taskQuery.data;
    if (task) {
      setOriginalTask(task);
      setTitle(task.title);
      setDate(task.date || '');
      setPoints(task.points || 0);
      setPriority(task.priority);
      setIsRecurring(task.is_recurring);
      setFrequency(task.frequency);
      setType(task.type);
      if (task.assignment_type === 'team_work') {
        setAssignmentCategory('team_work');
        setIsRotating(false);
      } else if (task.assignment_type === 'anyone') {
        setAssignmentCategory('anyone');
        setIsRotating(false);
        setAssignedTo('');
      } else if (task.assignment_type === 'strict_rotation') {
        setAssignmentCategory('individual');
        setIsRotating(true);
        setAssignedTo(task.assigned_to || '');
      } else {
        setAssignmentCategory('individual');
        setIsRotating(false);
        setAssignedTo(task.assigned_to || '');
      }
      setDescription(task.description || '');
      setLocation(task.location || '');
    }
  }, [taskQuery.data]);

  async function handleSave() {
    if (!title.trim() || !taskId) return;
    
    if (originalTask?.recurrence_id) {
      setEditModalOpen(true);
      return;
    }
    
    await saveChanges('single');
  }

  async function saveChanges(mode: 'single' | 'following') {
    if (!taskId || !originalTask) return;
    setEditModalOpen(false);

    try {
      const finalAssignmentType: 'team_work' | 'strict_rotation' | 'individual' | 'anyone' = assignmentCategory === 'team_work'
        ? 'team_work'
        : assignmentCategory === 'anyone'
          ? 'anyone'
          : (isRotating ? 'strict_rotation' : 'individual');

      const input: UpdateTaskInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority: type === 'task' ? priority : 'flexible',
        date: date || undefined,
        points: type === 'task' ? points : 0,
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : null,
        assignment_type: finalAssignmentType,
        assigned_to: assignmentCategory === 'individual' ? assignedTo : null,
        location: location.trim() || undefined,
      };

      await updateTaskMutation.mutateAsync({ taskId, input });

      if (mode === 'following' && originalTask.recurrence_id && originalTask.date) {
        // Delete any existing future tasks in this series
        await deleteTasksAfterMutation.mutateAsync({
          recurrenceId: originalTask.recurrence_id,
          date: originalTask.date,
        });

        // If it's still recurring, generate the new future tasks based on the updated frequency
        if (isRecurring && frequency && date) {
          const newTasks: CreateTaskInput[] = [];
          
          let currentDate = new Date(date);
          const endDate = new Date(currentDate);
          endDate.setFullYear(endDate.getFullYear() + 1);

          // Advance by one frequency step to skip the current task we just updated
          if (frequency === 'daily') {
            currentDate.setDate(currentDate.getDate() + 1);
          } else if (frequency === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else if (frequency === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
          }

          let currentAssignedTo = assignedTo;

          while (currentDate <= endDate) {
            newTasks.push({
              title: title.trim(),
              description: description.trim() || undefined,
              type,
              priority: type === 'task' ? priority : 'flexible',
              date: currentDate.toISOString().split('T')[0],
              points: type === 'task' ? points : 0,
              is_recurring: true,
              frequency,
              assignment_type: finalAssignmentType,
              assigned_to: assignmentCategory === 'individual' ? currentAssignedTo : undefined,
              location: location.trim() || undefined,
              recurrence_id: originalTask.recurrence_id,
            });

            if (finalAssignmentType === 'strict_rotation' && profiles.length > 1) {
              const currentIndex = profiles.findIndex(p => p.id === currentAssignedTo);
              const nextIndex = (currentIndex + 1) % profiles.length;
              currentAssignedTo = profiles[nextIndex]?.id || currentAssignedTo;
            }

            if (frequency === 'daily') {
              currentDate.setDate(currentDate.getDate() + 1);
            } else if (frequency === 'weekly') {
              currentDate.setDate(currentDate.getDate() + 7);
            } else if (frequency === 'monthly') {
              currentDate.setMonth(currentDate.getMonth() + 1);
            }
          }

          if (newTasks.length > 0) {
            await createTasksMutation.mutateAsync(newTasks);
          }
        }
      }

      navigate({ to: '/task/$taskId', params: { taskId } });
    } catch (err) {
      console.error('Update task error:', err);
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
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm" onClick={() => setEditModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden flex flex-col pointer-events-auto z-10">
            <div className="p-6 pb-4">
              <h3 className="text-lg font-bold text-slate-100 mb-2">{t('entryEdit.recurringModalTitle')}</h3>
              <p className="text-slate-400 text-sm">{t('entryEdit.recurringModalDescription')}</p>
            </div>
            <div className="flex flex-col border-t border-slate-700 divide-y divide-slate-700">
              <button onClick={() => saveChanges('single')} className="p-4 text-left text-slate-100 hover:bg-slate-700 transition-colors font-medium">{t('entryEdit.recurringModalOnlyThis')}</button>
              <button onClick={() => saveChanges('following')} className="p-4 text-left text-slate-100 hover:bg-slate-700 transition-colors font-medium">{t('entryEdit.recurringModalThisAndFollowing')}</button>
              <button onClick={() => setEditModalOpen(false)} className="p-4 text-center text-slate-400 hover:bg-slate-700 transition-colors font-medium bg-slate-800/50">{t('cta.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      <TopBar
        title={t('entryEdit.title')}
        titleIcon="edit_note"
        leftAction={{
          ariaLabel: t('topBar.close'),
          icon: 'close',
          onClick: () => router.history.back(),
        }}
        rightSlot={(
          <button
            aria-label={t('topBar.save')}
            className="flex min-h-10 items-center justify-end text-base font-bold tracking-[0.015em] text-primary transition-colors disabled:cursor-not-allowed disabled:text-primary/40"
            disabled={saving}
            onClick={handleSave}
            type="button"
          >
            {saving ? t('common.saving') : t('cta.save')}
          </button>
        )}
      />

      <div className="flex flex-col gap-6 px-4 py-4 max-w-md mx-auto w-full">
        <label className="flex flex-col w-full">
          <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">{t('entryForm.planName')}</p>
          <input
            className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 placeholder:text-primary/40 p-4 text-base font-normal leading-normal"
            placeholder={t('entryForm.planNamePlaceholder')}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className={`grid gap-4 ${type === 'task' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <label className="flex flex-col">
            <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">{t('entryForm.date')}</p>
            <input
              className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 p-4 text-base font-normal"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {type === 'task' && (
            <label className="flex flex-col">
              <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">{t('entryForm.points')}</p>
              <input
                className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 p-4 text-base font-normal"
                placeholder={t('entryForm.pointsPlaceholder')}
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value) || 0)}
              />
            </label>
          )}
        </div>

        <label className="flex flex-col w-full">
          <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">{t('entryForm.location')}</p>
          <input
            className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 placeholder:text-primary/40 p-4 text-base font-normal leading-normal"
            placeholder={t('entryForm.locationPlaceholder')}
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>

        {type === 'task' && (
          <div className="flex flex-col gap-3">
            <p className="text-slate-100 text-sm font-semibold leading-normal">{t('entryForm.priority')}</p>
            <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
              <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${priority === 'critical' ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
                <span className="truncate">{t('entryForm.priorityCritical')}</span>
                <input className="invisible w-0" name="priority" type="radio" value="critical" checked={priority === 'critical'} onChange={() => setPriority('critical')} />
              </label>
              <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${priority === 'flexible' ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
                <span className="truncate">{t('entryForm.priorityFlexible')}</span>
                <input className="invisible w-0" name="priority" type="radio" value="flexible" checked={priority === 'flexible'} onChange={() => setPriority('flexible')} />
              </label>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-slate-100 text-base font-bold leading-tight">{t('entryForm.recurring')}</p>
              <p className="text-primary/60 text-sm font-normal leading-normal">{t('entryForm.recurringDescription')}</p>
            </div>
            <label className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-all duration-200 ${isRecurring ? 'justify-end bg-primary' : 'bg-primary/20'}`}>
              <div className="h-full w-[27px] rounded-full bg-white shadow-md"></div>
              <input className="invisible absolute" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
            </label>
          </div>
          {isRecurring && (
            <div className="mt-2">
              <p className="text-slate-100 text-sm font-semibold leading-normal pb-3">{t('entryForm.frequency')}</p>
              <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
                {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                  <label key={f} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${frequency === f ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
                    <span className="truncate">{t(`entryForm.frequencyOptions.${f}`)}</span>
                    <input className="invisible w-0" name="frequency" type="radio" value={f} checked={frequency === f} onChange={() => setFrequency(f)} />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 mb-1">
          <p className="text-slate-100 text-sm font-semibold leading-normal">{t('entryForm.type')}</p>
          <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${type === 'task' ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="truncate">{t('entryForm.typeTask')}</span>
              </div>
              <input className="invisible w-0" name="entry_type" type="radio" value="task" checked={type === 'task'} onChange={() => setType('task')} />
            </label>
            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${type === 'event' ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                <span className="truncate">{t('entryForm.typeEvent')}</span>
              </div>
              <input className="invisible w-0" name="entry_type" type="radio" value="event" checked={type === 'event'} onChange={() => setType('event')} />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-slate-100 text-sm font-semibold leading-normal">{t('entryForm.assignmentType')}</p>
          <div className="flex flex-col gap-3">
            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${assignmentCategory === 'team_work' ? 'border-primary bg-primary/10' : 'border-primary/20 bg-primary/5'}`}>
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary shrink-0 relative">
                {assignmentCategory === 'team_work' && <div className="w-3 h-3 rounded-full bg-primary" />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-100">{t('entryForm.assignmentTeamTitle')}</span>
                <span className="text-xs text-primary/80">{t('entryForm.assignmentTeamDescription')}</span>
              </div>
              <input type="radio" className="hidden" checked={assignmentCategory === 'team_work'} onChange={() => { setAssignmentCategory('team_work'); setIsRotating(false); }} />
            </label>

            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${assignmentCategory === 'anyone' ? 'border-primary bg-primary/10' : 'border-primary/20 bg-primary/5'}`}>
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary shrink-0 relative">
                {assignmentCategory === 'anyone' && <div className="w-3 h-3 rounded-full bg-primary" />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-100">{t('entryForm.assignmentAnyoneTitle')}</span>
                <span className="text-xs text-primary/80">{t('entryForm.assignmentAnyoneDescription')}</span>
              </div>
              <input type="radio" className="hidden" checked={assignmentCategory === 'anyone'} onChange={() => { setAssignmentCategory('anyone'); setIsRotating(false); }} />
            </label>

            <div className={`flex flex-col gap-4 p-4 rounded-xl border transition-all ${assignmentCategory === 'individual' ? 'border-primary bg-primary/10' : 'border-primary/20 bg-primary/5'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary shrink-0 relative">
                  {assignmentCategory === 'individual' && <div className="w-3 h-3 rounded-full bg-primary" />}
                </div>
                <span className="text-sm font-bold text-slate-100">{t('entryForm.assignmentIndividual')}</span>
                <input type="radio" className="hidden" checked={assignmentCategory === 'individual'} onChange={() => setAssignmentCategory('individual')} />
              </label>

              {assignmentCategory === 'individual' && (
                <div className="flex flex-col gap-4 pl-9">
                  <div className="flex h-11 items-center justify-center rounded-xl border border-primary/20 bg-background-dark/50 p-1">
                    {profiles.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAssignedTo(p.id)}
                        className={`flex h-full grow items-center justify-center rounded-lg text-sm font-bold transition-all ${assignedTo === p.id ? 'bg-primary/20 text-primary' : 'text-primary/60 hover:text-primary'}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-semibold text-primary/80">{t('entryForm.makeRotating')}</span>
                    <label 
                      title={!isRecurring ? t('entryForm.rotatingDisabledHint') : ''}
                      className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-all duration-200 ${!isRecurring ? 'opacity-50 !cursor-not-allowed' : ''} ${isRotating ? 'justify-end bg-primary' : 'bg-primary/20'}`}
                    >
                      <div className="h-full w-[27px] rounded-full bg-white shadow-md"></div>
                      <input 
                        className="invisible absolute" 
                        type="checkbox" 
                        disabled={!isRecurring}
                        checked={isRotating} 
                        onChange={(e) => setIsRotating(e.target.checked)} 
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <label className="flex flex-col w-full pb-8">
          <div className="flex items-center gap-2 pb-2">
            <span className="material-symbols-outlined text-primary text-sm">description</span>
            <p className="text-slate-100 text-sm font-semibold leading-normal">{t('entryForm.description')}</p>
          </div>
          <textarea
            className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-32 placeholder:text-primary/40 p-4 text-base font-normal leading-normal resize-none"
            placeholder={t('entryForm.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
