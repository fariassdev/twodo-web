import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { entryFormSchema, type EntryFormValues } from '../lib/schemas';

import { useNavigate, useParams, useRouter } from '@tanstack/react-router';

export default function EditEntry() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const { taskId } = useParams({ strict: false }) as { taskId: string };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      title: '',
      date: '',
      points: 10,
      priority: 'critical',
      isRecurring: false,
      frequency: 'weekly',
      type: 'task',
      assignmentCategory: 'team_work',
      assignedTo: '',
      isRotating: false,
      description: '',
      location: '',
      startTime: '',
      endTime: '',
    },
  });

  const type = watch('type');
  const priority = watch('priority');
  const isRecurring = watch('isRecurring');
  const frequency = watch('frequency');
  const assignmentCategory = watch('assignmentCategory');
  const assignedTo = watch('assignedTo');
  const isRotating = watch('isRotating');
  const startTime = watch('startTime');

  // automatically adjust endTime when startTime changes
  useEffect(() => {
    if (!startTime) return;
    const endTime = getValues('endTime');
    if (!endTime || endTime <= startTime) {
      const [hStr, mStr] = startTime.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      let total = h * 60 + m + 30;
      let newEnd = '';
      if (total >= 24 * 60 - 1) {
        newEnd = '23:59';
      } else {
        const nh = Math.floor(total / 60);
        const nm = total % 60;
        newEnd = `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
      }
      setValue('endTime', newEnd);
    }
  }, [startTime]);

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
      setValue('assignedTo', profiles[0].id);
    }
  }, [profiles, assignedTo, assignmentCategory]);

  const [originalTask, setOriginalTask] = useState<Task | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Populate form when task data loads
  useEffect(() => {
    const task = taskQuery.data;
    if (task) {
      setOriginalTask(task);
      let category: 'team_work' | 'anyone' | 'individual' = 'team_work';
      let rotating = false;
      if (task.assignment_type === 'team_work') {
        category = 'team_work';
      } else if (task.assignment_type === 'anyone') {
        category = 'anyone';
      } else if (task.assignment_type === 'strict_rotation') {
        category = 'individual';
        rotating = true;
      } else {
        category = 'individual';
      }
      reset({
        title: task.title,
        date: task.date || '',
        points: task.points || 0,
        priority: task.priority as 'critical' | 'flexible',
        isRecurring: task.is_recurring,
        frequency: (task.frequency ?? 'weekly') as 'daily' | 'weekly' | 'monthly',
        type: task.type as 'task' | 'event',
        assignmentCategory: category,
        assignedTo: task.assigned_to || '',
        isRotating: rotating,
        description: task.description || '',
        location: task.location || '',
        startTime: task.start_time || '',
        endTime: task.end_time || '',
      });
    }
  }, [taskQuery.data, reset]);

  function handleSave() {
    if (originalTask?.recurrence_id) {
      setEditModalOpen(true);
      return;
    }
    void handleSubmit((data) => saveChanges('single', data))();
  }

  async function saveChanges(mode: 'single' | 'following', data: EntryFormValues) {
    if (!taskId || !originalTask) return;
    setEditModalOpen(false);

    try {
      const finalAssignmentType: 'team_work' | 'strict_rotation' | 'individual' | 'anyone' = data.assignmentCategory === 'team_work'
        ? 'team_work'
        : data.assignmentCategory === 'anyone'
          ? 'anyone'
          : (data.isRotating ? 'strict_rotation' : 'individual');

      const input: UpdateTaskInput = {
        title: data.title.trim(),
        description: data.description.trim() || undefined,
        type: data.type,
        priority: data.type === 'task' ? data.priority : 'flexible',
        date: data.date || undefined,
        points: data.type === 'task' ? data.points : 0,
        is_recurring: data.isRecurring,
        frequency: data.isRecurring ? data.frequency : null,
        assignment_type: finalAssignmentType,
        assigned_to: data.assignmentCategory === 'individual' ? data.assignedTo : null,
        location: data.location.trim() || undefined,
        start_time: data.startTime || undefined,
        end_time: data.endTime || undefined,
      };

      await updateTaskMutation.mutateAsync({ taskId, input });

      if (mode === 'following' && originalTask.recurrence_id && originalTask.date) {
        await deleteTasksAfterMutation.mutateAsync({
          recurrenceId: originalTask.recurrence_id,
          date: originalTask.date,
        });

        if (data.isRecurring && data.frequency && data.date) {
          const newTasks: CreateTaskInput[] = [];
          
          let currentDate = new Date(data.date);
          const endDate = new Date(currentDate);
          endDate.setFullYear(endDate.getFullYear() + 1);

          if (data.frequency === 'daily') {
            currentDate.setDate(currentDate.getDate() + 1);
          } else if (data.frequency === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else if (data.frequency === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
          }

          let currentAssignedTo = data.assignedTo;

          while (currentDate <= endDate) {
            newTasks.push({
              title: data.title.trim(),
              description: data.description.trim() || undefined,
              type: data.type,
              priority: data.type === 'task' ? data.priority : 'flexible',
              date: currentDate.toISOString().split('T')[0],
              points: data.type === 'task' ? data.points : 0,
              is_recurring: true,
              frequency: data.frequency,
              assignment_type: finalAssignmentType,
              assigned_to: data.assignmentCategory === 'individual' ? currentAssignedTo : undefined,
              location: data.location.trim() || undefined,
              start_time: data.startTime || undefined,
              end_time: data.endTime || undefined,
              recurrence_id: originalTask.recurrence_id,
            });

            if (finalAssignmentType === 'strict_rotation' && profiles.length > 1) {
              const currentIndex = profiles.findIndex(p => p.id === currentAssignedTo);
              const nextIndex = (currentIndex + 1) % profiles.length;
              currentAssignedTo = profiles[nextIndex]?.id || currentAssignedTo;
            }

            if (data.frequency === 'daily') {
              currentDate.setDate(currentDate.getDate() + 1);
            } else if (data.frequency === 'weekly') {
              currentDate.setDate(currentDate.getDate() + 7);
            } else if (data.frequency === 'monthly') {
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
              <button onClick={() => handleSubmit((data) => saveChanges('single', data))()} className="p-4 text-left text-slate-100 hover:bg-slate-700 transition-colors font-medium">{t('entryEdit.recurringModalOnlyThis')}</button>
              <button onClick={() => handleSubmit((data) => saveChanges('following', data))()} className="p-4 text-left text-slate-100 hover:bg-slate-700 transition-colors font-medium">{t('entryEdit.recurringModalThisAndFollowing')}</button>
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
            {...register('title')}
          />
          {errors.title && <p className="text-xs text-red-400 mt-1">{t(errors.title.message!)}</p>}
        </label>

        <div className={`grid gap-4 ${type === 'task' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <label className="flex flex-col">
            <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">{t('entryForm.date')}</p>
            <input
              className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 p-4 text-base font-normal"
              type="date"
              {...register('date')}
            />
          </label>
          {type === 'task' && (
            <label className="flex flex-col">
              <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">{t('entryForm.points')}</p>
              <input
                className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 p-4 text-base font-normal"
                placeholder={t('entryForm.pointsPlaceholder')}
                type="number"
                {...register('points', { valueAsNumber: true })}
              />
            </label>
          )}
        </div>
        <div className="grid gap-4 grid-cols-2">
          <label className="flex flex-col">
            <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">{t('entryForm.startTime')}</p>
            <input
              className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 p-4 text-base font-normal"
              type="time"
              placeholder={t('entryForm.startTimePlaceholder')}
              {...register('startTime')}
            />
          </label>
          <label className="flex flex-col">
            <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">{t('entryForm.endTime')}</p>
            <input
              className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 p-4 text-base font-normal"
              type="time"
              placeholder={t('entryForm.endTimePlaceholder')}
              {...register('endTime')}
            />
          </label>
        </div>
        {errors.endTime && <p className="text-sm text-red-400 mt-1">{t(errors.endTime.message!)}</p>}

        <label className="flex flex-col w-full">
          <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">{t('entryForm.location')}</p>
          <input
            className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 placeholder:text-primary/40 p-4 text-base font-normal leading-normal"
            placeholder={t('entryForm.locationPlaceholder')}
            type="text"
            {...register('location')}
          />
        </label>

        {type === 'task' && (
          <div className="flex flex-col gap-3">
            <p className="text-slate-100 text-sm font-semibold leading-normal">{t('entryForm.priority')}</p>
            <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
              <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${priority === 'critical' ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
                <span className="truncate">{t('entryForm.priorityCritical')}</span>
                <input className="invisible w-0" type="radio" value="critical" {...register('priority')} />
              </label>
              <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${priority === 'flexible' ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
                <span className="truncate">{t('entryForm.priorityFlexible')}</span>
                <input className="invisible w-0" type="radio" value="flexible" {...register('priority')} />
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
              <input className="invisible absolute" type="checkbox" {...register('isRecurring')} />
            </label>
          </div>
          {isRecurring && (
            <div className="mt-2">
              <p className="text-slate-100 text-sm font-semibold leading-normal pb-3">{t('entryForm.frequency')}</p>
              <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
                {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                  <label key={f} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${frequency === f ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
                    <span className="truncate">{t(`entryForm.frequencyOptions.${f}`)}</span>
                    <input className="invisible w-0" type="radio" value={f} {...register('frequency')} />
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
              <input className="invisible w-0" type="radio" value="task" {...register('type')} />
            </label>
            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${type === 'event' ? 'bg-background-dark shadow-sm text-primary' : 'text-primary/60'}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                <span className="truncate">{t('entryForm.typeEvent')}</span>
              </div>
              <input className="invisible w-0" type="radio" value="event" {...register('type')} />
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
              <input type="radio" className="hidden" value="team_work" {...register('assignmentCategory')} onChange={() => { setValue('assignmentCategory', 'team_work'); setValue('isRotating', false); }} />
            </label>

            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${assignmentCategory === 'anyone' ? 'border-primary bg-primary/10' : 'border-primary/20 bg-primary/5'}`}>
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary shrink-0 relative">
                {assignmentCategory === 'anyone' && <div className="w-3 h-3 rounded-full bg-primary" />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-100">{t('entryForm.assignmentAnyoneTitle')}</span>
                <span className="text-xs text-primary/80">{t('entryForm.assignmentAnyoneDescription')}</span>
              </div>
              <input type="radio" className="hidden" value="anyone" {...register('assignmentCategory')} onChange={() => { setValue('assignmentCategory', 'anyone'); setValue('isRotating', false); }} />
            </label>

            <div className={`flex flex-col gap-4 p-4 rounded-xl border transition-all ${assignmentCategory === 'individual' ? 'border-primary bg-primary/10' : 'border-primary/20 bg-primary/5'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary shrink-0 relative">
                  {assignmentCategory === 'individual' && <div className="w-3 h-3 rounded-full bg-primary" />}
                </div>
                <span className="text-sm font-bold text-slate-100">{t('entryForm.assignmentIndividual')}</span>
                <input type="radio" className="hidden" value="individual" {...register('assignmentCategory')} />
              </label>

              {assignmentCategory === 'individual' && (
                <div className="flex flex-col gap-4 pl-9">
                  <div className="flex h-11 items-center justify-center rounded-xl border border-primary/20 bg-background-dark/50 p-1">
                    {profiles.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setValue('assignedTo', p.id)}
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
                        {...register('isRotating')}
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
            {...register('description')}
          />
        </label>
      </div>
    </div>
  );
}
