import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateTasksMutation, useProfilesQuery, useTaskCatalogQuery } from '../lib/queryHooks';
import type { CreateTaskInput } from '../lib/queries';
import type { Profile, TaskCatalogItem } from '../lib/types';
import { useTranslation } from 'react-i18next';
import TopBar from './ui/TopBar';
import { entryFormSchema, EFFORT_LEVELS, TIME_OF_DAY_OPTIONS, TASK_CATEGORIES, type EntryFormValues, type EffortLevel, type TimeOfDay, type TaskCategory } from '../lib/schemas';

import { useNavigate, useSearch, useRouter } from '@tanstack/react-router';

export default function CreateEntry() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const searchParams = useSearch({ strict: false }) as { date?: string; type?: 'task' | 'event'; startTime?: string; endTime?: string };
  const initialDate = searchParams?.date;
  const initialType = searchParams?.type === 'event' ? 'event' : 'task';
  const initialStartTime = searchParams?.startTime || '';
  const initialEndTime = searchParams?.endTime || '';

  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<TaskCatalogItem | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      title: '',
      date: initialDate || new Date().toISOString().split('T')[0],
      effortLevel: 'M',
      urgency: 'normal',
      timeOfDay: 'anytime',
      category: 'other',
      catalogTaskId: undefined,
      isRecurring: false,
      frequency: 'weekly',
      type: initialType,
      assignmentCategory: 'team_work',
      assignedTo: '',
      isRotating: false,
      description: '',
      location: '',
      startTime: initialStartTime,
      endTime: initialEndTime,
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

  // automatically adjust endTime when startTime is entered
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
  const catalogQuery = useTaskCatalogQuery();
  const createTasksMutation = useCreateTasksMutation();

  const profiles: Profile[] = profilesQuery.data ?? [];
  const catalog: TaskCatalogItem[] = catalogQuery.data ?? [];
  const saving = createTasksMutation.isPending;

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return catalog;
    const q = catalogSearch.toLowerCase();
    return catalog.filter(item => {
      const name = i18n.language === 'es' ? item.name_es : item.name_en;
      return name.toLowerCase().includes(q);
    });
  }, [catalog, catalogSearch, i18n.language]);

  useEffect(() => {
    if (profiles.length > 0 && !assignedTo) {
      setValue('assignedTo', profiles[0].id);
    }
  }, [profiles, assignedTo]);

  function handleCatalogSelect(item: TaskCatalogItem) {
    setSelectedCatalogItem(item);
    const name = i18n.language === 'es' ? item.name_es : item.name_en;
    setValue('title', name);
    setValue('effortLevel', item.default_effort_level as EffortLevel);
    setValue('category', item.category);
    setValue('catalogTaskId', item.id);
    setCatalogSearch('');
  }

  function handleCustomTask() {
    setSelectedCatalogItem(null);
    setValue('catalogTaskId', undefined);
  }

  async function onSubmit(data: EntryFormValues) {
    try {
      const finalAssignmentType: 'team_work' | 'strict_rotation' | 'individual' | 'anyone' = data.assignmentCategory === 'team_work'
        ? 'team_work'
        : data.assignmentCategory === 'anyone'
          ? 'anyone'
          : (data.isRotating ? 'strict_rotation' : 'individual');

      const baseInput: Omit<CreateTaskInput, 'date' | 'recurrence_id'> = {
        title: data.title.trim(),
        description: data.description.trim() || undefined,
        type: data.type,
        priority: data.type === 'task' ? data.urgency : 'normal',
        effort_level: data.type === 'task' ? data.effortLevel as EffortLevel : undefined,
        time_of_day: data.type === 'task' ? data.timeOfDay as TimeOfDay : undefined,
        category: data.type === 'task' ? data.category : undefined,
        catalog_task_id: data.type === 'task' ? data.catalogTaskId || null : null,
        is_recurring: data.isRecurring,
        frequency: data.isRecurring ? data.frequency : null,
        assignment_type: finalAssignmentType,
        assigned_to: data.assignmentCategory === 'individual' ? data.assignedTo : undefined,
        location: data.type === 'event' ? (data.location.trim() || undefined) : undefined,
        start_time: data.type === 'event' ? (data.startTime || undefined) : undefined,
        end_time: data.type === 'event' ? (data.endTime || undefined) : undefined,
      };

      let inputs: CreateTaskInput[] = [];

      if (data.isRecurring && data.frequency && data.date) {
        const recurrenceId = crypto.randomUUID();
        const baseDate = new Date(data.date);
        const instancesCount = data.frequency === 'daily' ? 365 : data.frequency === 'weekly' ? 52 : 12;

        let currentAssignedTo = data.assignedTo;

        for (let i = 0; i < instancesCount; i++) {
          const instanceDate = new Date(baseDate);
          if (data.frequency === 'daily') {
            instanceDate.setDate(instanceDate.getDate() + i);
          } else if (data.frequency === 'weekly') {
            instanceDate.setDate(instanceDate.getDate() + i * 7);
          } else if (data.frequency === 'monthly') {
            instanceDate.setMonth(instanceDate.getMonth() + i);
          }
          inputs.push({
            ...baseInput,
            assigned_to: data.assignmentCategory === 'individual' ? currentAssignedTo : undefined,
            date: instanceDate.toISOString().split('T')[0],
            recurrence_id: recurrenceId,
          });

          if (finalAssignmentType === 'strict_rotation' && profiles.length > 1) {
            const currentIndex = profiles.findIndex(p => p.id === currentAssignedTo);
            const nextIndex = (currentIndex + 1) % profiles.length;
            currentAssignedTo = profiles[nextIndex]?.id || currentAssignedTo;
          }
        }
      } else {
        inputs.push({
          ...baseInput,
          date: data.date || undefined,
        });
      }

      const createdTasks = await createTasksMutation.mutateAsync(inputs);
      const firstTask = createdTasks[0];
      if (firstTask) {
        navigate({ to: '/task/$taskId', params: { taskId: firstTask.id } });
      } else {
        router.history.back();
      }
    } catch (err) {
      console.error('Create task error:', err);
    }
  }

  const inputClass = 'flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 placeholder:text-primary/40 p-4 text-base font-normal leading-normal';
  const labelClass = 'text-slate-100 text-sm font-semibold leading-normal pb-2';
  const pillActiveClass = 'bg-background-dark shadow-sm text-primary';
  const pillInactiveClass = 'text-primary/60';

  return (
    <div className="flex flex-col min-h-screen bg-background-dark">
      <TopBar
        title={t('entryCreate.title')}
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
            onClick={handleSubmit(onSubmit)}
            type="button"
          >
            {saving ? t('common.saving') : t('cta.save')}
          </button>
        )}
      />

      <div className="flex flex-col gap-6 px-4 py-4 max-w-md mx-auto w-full">
        {/* ── Type Selector ── */}
        <div className="flex flex-col gap-3 mb-1">
          <p className={labelClass}>{t('entryForm.type')}</p>
          <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${type === 'task' ? pillActiveClass : pillInactiveClass}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="truncate">{t('entryForm.typeTask')}</span>
              </div>
              <input className="invisible w-0" type="radio" value="task" {...register('type')} />
            </label>
            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${type === 'event' ? pillActiveClass : pillInactiveClass}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                <span className="truncate">{t('entryForm.typeEvent')}</span>
              </div>
              <input className="invisible w-0" type="radio" value="event" {...register('type')} />
            </label>
          </div>
        </div>

        {/* ── Task Catalog (only for tasks) ── */}
        {type === 'task' && !selectedCatalogItem && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-4 text-primary/40">search</span>
              <input
                className={`${inputClass} !pl-12`}
                placeholder={t('entryForm.catalogSearch')}
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {filteredCatalog.map(item => {
                const name = i18n.language === 'es' ? item.name_es : item.name_en;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleCatalogSelect(item)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-left"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-100 text-sm font-medium truncate">{name}</p>
                      <p className="text-primary/60 text-xs">{t(`entryForm.categories.${item.category}` as const)} · {t(`entryForm.effortLevels.${item.default_effort_level}` as const)}</p>
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleCustomTask}
                className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-primary/30 hover:bg-primary/5 transition-all"
              >
                <span className="material-symbols-outlined text-primary/60">add_circle</span>
                <span className="text-sm font-medium text-primary/80">{t('entryForm.createCustomTask')}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Task Name ── */}
        <label className="flex flex-col w-full">
          <p className={labelClass}>{t('entryForm.planName')}</p>
          <input
            className={inputClass}
            placeholder={t('entryForm.planNamePlaceholder')}
            type="text"
            {...register('title')}
          />
          {errors.title && <p className="text-xs text-red-400 mt-1">{t(errors.title.message!)}</p>}
        </label>

        {/* ── Date + Effort Level (tasks) ── */}
        <div className={`grid gap-4 ${type === 'task' ? 'grid-cols-1' : 'grid-cols-1'}`}>
          <label className="flex flex-col">
            <p className={labelClass}>{t('entryForm.date')}</p>
            <input
              className={inputClass}
              type="date"
              {...register('date')}
            />
          </label>
        </div>

        {/* ── Effort Level (task only) ── */}
        {type === 'task' && (
          <div className="flex flex-col gap-3">
            <p className={labelClass}>{t('entryForm.effort')}</p>
            <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
              {EFFORT_LEVELS.map(level => (
                <label key={level} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${effortLevel === level ? pillActiveClass : pillInactiveClass}`}>
                  <span className="truncate">{t(`entryForm.effortLevels.${level}` as const)}</span>
                  <input className="invisible w-0" type="radio" value={level} {...register('effortLevel')} />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Time of Day (task only) ── */}
        {type === 'task' && (
          <div className="flex flex-col gap-3">
            <p className={labelClass}>{t('entryForm.timeOfDay')}</p>
            <div className="grid grid-cols-4 gap-2">
              {TIME_OF_DAY_OPTIONS.map(tod => (
                <label key={tod} className={`flex cursor-pointer items-center justify-center rounded-xl px-2 py-3 text-xs font-bold transition-all border ${timeOfDay === tod ? 'border-primary bg-primary/15 text-primary' : 'border-primary/20 bg-primary/5 text-primary/60'}`}>
                  <span className="truncate text-center">{t(`entryForm.timeOfDayOptions.${tod}` as const)}</span>
                  <input className="invisible w-0 absolute" type="radio" value={tod} {...register('timeOfDay')} />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Category (task only, when custom) ── */}
        {type === 'task' && !selectedCatalogItem && (
          <div className="flex flex-col gap-3">
            <p className={labelClass}>{t('entryForm.category')}</p>
            <div className="grid grid-cols-4 gap-2">
              {TASK_CATEGORIES.map(cat => (
                <label key={cat} className={`flex cursor-pointer items-center justify-center rounded-xl px-2 py-3 text-xs font-bold transition-all border ${category === cat ? 'border-primary bg-primary/15 text-primary' : 'border-primary/20 bg-primary/5 text-primary/60'}`}>
                  <span className="truncate text-center">{t(`entryForm.categories.${cat}` as const)}</span>
                  <input className="invisible w-0 absolute" type="radio" value={cat} {...register('category')} />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Urgency (task only) ── */}
        {type === 'task' && (
          <div className="flex flex-col gap-3">
            <p className={labelClass}>{t('entryForm.urgency')}</p>
            <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
              <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${urgency === 'normal' ? pillActiveClass : pillInactiveClass}`}>
                <span className="truncate">{t('entryForm.urgencyNormal')}</span>
                <input className="invisible w-0" type="radio" value="normal" {...register('urgency')} />
              </label>
              <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${urgency === 'high' ? pillActiveClass : pillInactiveClass}`}>
                <span className="truncate">{t('entryForm.urgencyHigh')}</span>
                <input className="invisible w-0" type="radio" value="high" {...register('urgency')} />
              </label>
            </div>
          </div>
        )}

        {/* ── Event-only fields ── */}
        {type === 'event' && (
          <>
            <div className="grid gap-4 grid-cols-2">
              <label className="flex flex-col">
                <p className={labelClass}>{t('entryForm.startTime')}</p>
                <input className={inputClass} type="time" placeholder={t('entryForm.startTimePlaceholder')} {...register('startTime')} />
              </label>
              <label className="flex flex-col">
                <p className={labelClass}>{t('entryForm.endTime')}</p>
                <input className={inputClass} type="time" placeholder={t('entryForm.endTimePlaceholder')} {...register('endTime')} />
              </label>
            </div>
            {errors.endTime && <p className="text-sm text-red-400 mt-1">{t(errors.endTime.message!)}</p>}

            <label className="flex flex-col w-full">
              <p className={labelClass}>{t('entryForm.location')}</p>
              <input className={inputClass} placeholder={t('entryForm.locationPlaceholder')} type="text" {...register('location')} />
            </label>
          </>
        )}

        {/* ── Recurring ── */}
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
                  <label key={f} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-bold transition-all ${frequency === f ? pillActiveClass : pillInactiveClass}`}>
                    <span className="truncate">{t(`entryForm.frequencyOptions.${f}`)}</span>
                    <input className="invisible w-0" type="radio" value={f} {...register('frequency')} />
                  </label>
                ))}
              </div>
            </div>
          )}
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

        {/* ── Description ── */}
        <label className="flex flex-col w-full pb-8">
          <div className="flex items-center gap-2 pb-2">
            <span className="material-symbols-outlined text-primary text-sm">description</span>
            <p className={labelClass}>{t('entryForm.description')}</p>
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
