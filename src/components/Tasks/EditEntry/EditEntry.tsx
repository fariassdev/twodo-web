import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCreateTasksMutation,
  useDeleteTasksAfterMutation,
  useProfilesQuery,
  useTaskByIdQuery,
  useUpdateTaskMutation,
} from '../../../lib/queryHooks';
import type { UpdateTaskInput, CreateTaskInput } from '../../../lib/queries';
import type { Task, Profile } from '../../../lib/types';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../ui/PageHeader';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import FormField from '../../ui/FormField';
import FormSection from '../../ui/FormSection';
import Modal from '../../ui/Modal';
import TextInput from '../../ui/TextInput';
import FullPageLoading from '../../ui/FullPageLoading';
import { SegmentedControl, SegmentedControlItem } from '../../ui/SegmentedControl';
import { entryFormSchema, EFFORT_LEVELS, TIME_OF_DAY_OPTIONS, TASK_CATEGORIES, type EntryFormValues, type EffortLevel, type TimeOfDay } from '../../../helpers/schemas';
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
      effortLevel: 'M',
      urgency: 'normal',
      timeOfDay: 'anytime',
      category: 'other',
      catalogTaskId: undefined,
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
  const effortLevel = watch('effortLevel');
  const urgency = watch('urgency');
  const timeOfDay = watch('timeOfDay');
  const category = watch('category');
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
      const total = h * 60 + m + 30;
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

  // Map effort level from points for backwards compatibility
  function pointsToEffortLevel(points: number): EffortLevel {
    if (points <= 2) return 'S';
    if (points <= 4) return 'M';
    if (points <= 8) return 'L';
    return 'XL';
  }

  // Populate form when task data loads
  useEffect(() => {
    const task = taskQuery.data;
    if (task) {
      setOriginalTask(task);
      let assignCategory: 'team_work' | 'anyone' | 'individual' = 'team_work';
      let rotating = false;
      if (task.assignment_type === 'team_work') {
        assignCategory = 'team_work';
      } else if (task.assignment_type === 'anyone') {
        assignCategory = 'anyone';
      } else if (task.assignment_type === 'strict_rotation') {
        assignCategory = 'individual';
        rotating = true;
      } else {
        assignCategory = 'individual';
      }

      const effortLvl = (task.effort_level as EffortLevel) || pointsToEffortLevel(task.points);

      reset({
        title: task.title,
        date: task.date || '',
        effortLevel: effortLvl,
        urgency: (task.priority === 'high' ? 'high' : 'normal') as 'normal' | 'high',
        timeOfDay: (task.time_of_day || 'anytime') as TimeOfDay,
        category: task.category || 'other',
        catalogTaskId: task.catalog_task_id || undefined,
        isRecurring: task.is_recurring,
        frequency: (task.frequency ?? 'weekly') as 'daily' | 'weekly' | 'monthly',
        type: task.type as 'task' | 'event',
        assignmentCategory: assignCategory,
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
        priority: data.type === 'task' ? data.urgency : 'normal',
        date: data.date || undefined,
        effort_level: data.type === 'task' ? data.effortLevel as EffortLevel : undefined,
        time_of_day: data.type === 'task' ? data.timeOfDay as TimeOfDay : undefined,
        category: data.type === 'task' ? data.category : undefined,
        catalog_task_id: data.type === 'task' ? data.catalogTaskId || null : null,
        is_recurring: data.isRecurring,
        frequency: data.isRecurring ? data.frequency : null,
        assignment_type: finalAssignmentType,
        assigned_to: data.assignmentCategory === 'individual' ? data.assignedTo : null,
        location: data.type === 'event' ? (data.location.trim() || undefined) : undefined,
        start_time: data.type === 'event' ? (data.startTime || undefined) : undefined,
        end_time: data.type === 'event' ? (data.endTime || undefined) : undefined,
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
              priority: data.type === 'task' ? data.urgency : 'normal',
              date: currentDate.toISOString().split('T')[0],
              effort_level: data.type === 'task' ? data.effortLevel as EffortLevel : undefined,
              time_of_day: data.type === 'task' ? data.timeOfDay as TimeOfDay : undefined,
              category: data.type === 'task' ? data.category : undefined,
              catalog_task_id: data.type === 'task' ? data.catalogTaskId || null : null,
              is_recurring: true,
              frequency: data.frequency,
              assignment_type: finalAssignmentType,
              assigned_to: data.assignmentCategory === 'individual' ? currentAssignedTo : undefined,
              location: data.type === 'event' ? (data.location.trim() || undefined) : undefined,
              start_time: data.type === 'event' ? (data.startTime || undefined) : undefined,
              end_time: data.type === 'event' ? (data.endTime || undefined) : undefined,
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

  const labelClass = 'text-surface-2 text-sm font-semibold leading-normal pb-2';

  if (loading) {
    return <FullPageLoading message={t('loading')} />;
  }


  return (
    <div className="flex flex-col min-h-screen bg-background-dark">
      <Modal open={editModalOpen} overlayAriaLabel={t('cta.cancel')} onClose={() => setEditModalOpen(false)}>
        <Card className="overflow-hidden" padding="none" radius="2xl" variant="modal">
          <div className="p-6 pb-4">
            <h3 className="mb-2 text-lg font-bold text-surface-2">{t('entryEdit.recurringModalTitle')}</h3>
            <p className="text-sm text-surface-2/60">{t('entryEdit.recurringModalDescription')}</p>
          </div>
          <div className="flex flex-col divide-y divide-border-subtle border-t border-border-subtle">
            <Button className="justify-start" onClick={() => handleSubmit((data) => saveChanges('single', data))()} size="menu" variant="modalAction">
              {t('entryEdit.recurringModalOnlyThis')}
            </Button>
            <Button className="justify-start" onClick={() => handleSubmit((data) => saveChanges('following', data))()} size="menu" variant="modalAction">
              {t('entryEdit.recurringModalThisAndFollowing')}
            </Button>
            <Button className="justify-center bg-surface-1 text-surface-2/60" onClick={() => setEditModalOpen(false)} size="menu" variant="modalAction">
              {t('cta.cancel')}
            </Button>
          </div>
        </Card>
      </Modal>

      <PageHeader
        title={t('entryEdit.title')}
        subtitle={type === 'task' ? t('entryForm.typeTask') : t('entryForm.typeEvent')}
        backAction={{
          onClick: () => router.history.back(),
        }}
        rightSlot={(
          <Button
            aria-label={t('topBar.save')}
            className="min-h-10 justify-end px-0 text-base font-bold tracking-[0.015em] text-primary disabled:text-primary/40"
            disabled={saving}
            onClick={handleSave}
            size="sm"
            variant="ghost"
          >
            {saving ? t('common.saving') : t('cta.save')}
          </Button>
        )}
      />

      <div className="flex flex-col gap-6 px-4 py-4 max-w-md mx-auto w-full">
        {/* ── Task Name ── */}
        <FormField error={errors.title ? t(errors.title.message!) : null} label={t('entryForm.planName')}>
          <TextInput
            placeholder={t('entryForm.planNamePlaceholder')}
            size="lg"
            type="text"
            variant="soft"
            {...register('title')}
          />
        </FormField>

        {/* ── Date ── */}
        <FormField label={t('entryForm.date')}>
          <TextInput size="lg" type="date" variant="soft" {...register('date')} />
        </FormField>

        {/* ── Effort Level (task only) ── */}
        {type === 'task' && (
          <div className="flex flex-col gap-3">
            <p className={labelClass}>{t('entryForm.effort')}</p>
            <SegmentedControl>
              {EFFORT_LEVELS.map(level => (
                <SegmentedControlItem active={effortLevel === level} key={level}>
                  <span className="truncate">{t(`entryForm.effortLevels.${level}` as const)}</span>
                  <input className="invisible w-0" type="radio" value={level} {...register('effortLevel')} />
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
        )}

        {/* ── Time of Day (task only) ── */}
        {type === 'task' && (
          <div className="flex flex-col gap-3">
            <p className={labelClass}>{t('entryForm.timeOfDay')}</p>
            <SegmentedControl className="grid-cols-4" variant="grid">
              {TIME_OF_DAY_OPTIONS.map(tod => (
                <SegmentedControlItem active={timeOfDay === tod} key={tod} variant="chip">
                  <span className="truncate text-center">{t(`entryForm.timeOfDayOptions.${tod}` as const)}</span>
                  <input className="invisible w-0 absolute" type="radio" value={tod} {...register('timeOfDay')} />
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
        )}

        {/* ── Category (task only) ── */}
        {type === 'task' && (
          <div className="flex flex-col gap-3">
            <p className={labelClass}>{t('entryForm.category')}</p>
            <SegmentedControl className="grid-cols-4" variant="grid">
              {TASK_CATEGORIES.map(cat => (
                <SegmentedControlItem active={category === cat} key={cat} variant="chip">
                  <span className="truncate text-center">{t(`entryForm.categories.${cat}` as const)}</span>
                  <input className="invisible w-0 absolute" type="radio" value={cat} {...register('category')} />
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
        )}

        {/* ── Urgency (task only) ── */}
        {type === 'task' && (
          <div className="flex flex-col gap-3">
            <p className={labelClass}>{t('entryForm.urgency')}</p>
            <SegmentedControl>
              <SegmentedControlItem active={urgency === 'normal'}>
                <span className="truncate">{t('entryForm.urgencyNormal')}</span>
                <input className="invisible w-0" type="radio" value="normal" {...register('urgency')} />
              </SegmentedControlItem>
              <SegmentedControlItem active={urgency === 'high'}>
                <span className="truncate">{t('entryForm.urgencyHigh')}</span>
                <input className="invisible w-0" type="radio" value="high" {...register('urgency')} />
              </SegmentedControlItem>
            </SegmentedControl>
          </div>
        )}

        {/* ── Event-only fields ── */}
        {type === 'event' && (
          <>
            <div className="grid gap-4 grid-cols-2">
              <FormField label={t('entryForm.startTime')}>
                <TextInput
                  placeholder={t('entryForm.startTimePlaceholder')}
                  size="lg"
                  type="time"
                  variant="soft"
                  {...register('startTime')}
                />
              </FormField>
              <FormField label={t('entryForm.endTime')}>
                <TextInput
                  placeholder={t('entryForm.endTimePlaceholder')}
                  size="lg"
                  type="time"
                  variant="soft"
                  {...register('endTime')}
                />
              </FormField>
            </div>
            {errors.endTime && <p className="text-sm text-red-400 mt-1">{t(errors.endTime.message!)}</p>}

            <FormField label={t('entryForm.location')}>
              <TextInput
                placeholder={t('entryForm.locationPlaceholder')}
                size="lg"
                type="text"
                variant="soft"
                {...register('location')}
              />
            </FormField>
          </>
        )}

        {/* ── Recurring ── */}
        <FormSection>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-surface-2 text-base font-bold leading-tight">{t('entryForm.recurring')}</p>
              <p className="text-surface-2/60 text-sm font-normal leading-normal">{t('entryForm.recurringDescription')}</p>
            </div>
            <label className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-all duration-200 ${isRecurring ? 'justify-end bg-primary' : 'bg-primary/20'}`}>
              <div className="h-full w-[27px] rounded-full bg-white shadow-md"></div>
              <input className="invisible absolute" type="checkbox" {...register('isRecurring')} />
            </label>
          </div>
          {isRecurring && (
            <div className="mt-2">
              <p className="text-surface-2 text-sm font-semibold leading-normal pb-3">{t('entryForm.frequency')}</p>
              <SegmentedControl>
                {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                  <SegmentedControlItem active={frequency === f} key={f}>
                    <span className="truncate">{t(`entryForm.frequencyOptions.${f}`)}</span>
                    <input className="invisible w-0" type="radio" value={f} {...register('frequency')} />
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </div>
          )}
        </FormSection>

        {/* ── Type ── */}
        <div className="flex flex-col gap-3 mb-1">
          <p className={labelClass}>{t('entryForm.type')}</p>
          <SegmentedControl>
            <SegmentedControlItem active={type === 'task'}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="truncate">{t('entryForm.typeTask')}</span>
              </div>
              <input className="invisible w-0" type="radio" value="task" {...register('type')} />
            </SegmentedControlItem>
            <SegmentedControlItem active={type === 'event'}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                <span className="truncate">{t('entryForm.typeEvent')}</span>
              </div>
              <input className="invisible w-0" type="radio" value="event" {...register('type')} />
            </SegmentedControlItem>
          </SegmentedControl>
        </div>

        {/* ── Assignment ── */}
        <div className="flex flex-col gap-3">
          <p className={labelClass}>{t('entryForm.assignmentType')}</p>
          <div className="flex flex-col gap-3">
            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${assignmentCategory === 'team_work' ? 'border-primary bg-primary/10' : 'border-primary/20 bg-primary/5'}`}>
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary shrink-0 relative">
                {assignmentCategory === 'team_work' && <div className="w-3 h-3 rounded-full bg-primary" />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-surface-2">{t('entryForm.assignmentTeamTitle')}</span>
                <span className="text-xs text-primary/80">{t('entryForm.assignmentTeamDescription')}</span>
              </div>
              <input type="radio" className="hidden" value="team_work" {...register('assignmentCategory')} onChange={() => { setValue('assignmentCategory', 'team_work'); setValue('isRotating', false); }} />
            </label>

            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${assignmentCategory === 'anyone' ? 'border-primary bg-primary/10' : 'border-primary/20 bg-primary/5'}`}>
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary shrink-0 relative">
                {assignmentCategory === 'anyone' && <div className="w-3 h-3 rounded-full bg-primary" />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-surface-2">{t('entryForm.assignmentAnyoneTitle')}</span>
                <span className="text-xs text-primary/80">{t('entryForm.assignmentAnyoneDescription')}</span>
              </div>
              <input type="radio" className="hidden" value="anyone" {...register('assignmentCategory')} onChange={() => { setValue('assignmentCategory', 'anyone'); setValue('isRotating', false); }} />
            </label>

            <div className={`flex flex-col gap-4 p-4 rounded-xl border transition-all ${assignmentCategory === 'individual' ? 'border-primary bg-primary/10' : 'border-primary/20 bg-primary/5'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary shrink-0 relative">
                  {assignmentCategory === 'individual' && <div className="w-3 h-3 rounded-full bg-primary" />}
                </div>
                <span className="text-sm font-bold text-surface-2">{t('entryForm.assignmentIndividual')}</span>
                <input type="radio" className="hidden" value="individual" {...register('assignmentCategory')} />
              </label>

              {assignmentCategory === 'individual' && (
                <div className="flex flex-col gap-4 pl-9">
                  <div className="flex h-11 items-center justify-center rounded-xl border border-primary/20 bg-surface-2/5 p-1">
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

        {/* ── Description ── */}
        <FormField
          className="w-full pb-8"
          label={(
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">description</span>
              <span>{t('entryForm.description')}</span>
            </span>
          )}
        >
          <textarea
            className="flex w-full rounded-xl text-surface-2 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-32 placeholder:text-primary/40 p-4 text-base font-normal leading-normal resize-none"
            placeholder={t('entryForm.descriptionPlaceholder')}
            {...register('description')}
          />
        </FormField>
      </div>
    </div>
  );
}
