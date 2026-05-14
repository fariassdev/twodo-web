import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTaskActions, useTaskCatalog } from '../../../api/hooks';
import { useProfilesQuery } from '../../../lib/queryHooks';
import type { CreateTaskInput } from '../../../api/mutations/tasks';
import type { Profile, TaskCatalogItem } from '../../../lib/types';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../ui/PageHeader';
import { entryFormSchema, EFFORT_LEVELS, EFFORT_POINTS, TIME_OF_DAY_OPTIONS, TASK_CATEGORIES, type EntryFormValues, type EffortLevel, type TimeOfDay, type TaskCategory } from '../../../helpers/schemas';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import TextInput from '../../ui/TextInput';
import FormField from '../../ui/FormField';
import FormSection from '../../ui/FormSection';
import { SegmentedControl, SegmentedControlItem } from '../../ui/SegmentedControl';
import { getLocalDateString } from '../../../utils';

import { useNavigate, useSearch, useRouter } from '@tanstack/react-router';

type Step = 'type-select' | 'catalog' | 'form';

const CATEGORY_ICONS: Record<string, string> = {
  trash: '🗑️',
  cleaning: '🧹',
  bathroom: '🚿',
  kitchen: '🍳',
  shopping: '🛒',
  laundry: '🧺',
  other: '📦',
};

export default function CreateEntry() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const searchParams = useSearch({ strict: false }) as { date?: string; type?: 'task' | 'event'; startTime?: string; endTime?: string };
  const initialDate = searchParams?.date;
  const initialType = searchParams?.type === 'event' ? 'event' : 'task';
  const initialStartTime = searchParams?.startTime || '';
  const initialEndTime = searchParams?.endTime || '';

  const [step, setStep] = useState<Step>('type-select');
  const [selectedType, setSelectedType] = useState<'task' | 'event'>(initialType);
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
      date: initialDate || getLocalDateString(),
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
      const h = Number.parseInt(hStr, 10);
      const m = Number.parseInt(mStr, 10);
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
  const { catalog, loading: catalogLoading } = useTaskCatalog();
  const { createTasks, isLoading: saving } = useTaskActions();

  const profiles: Profile[] = profilesQuery.data ?? [];

  // Group catalog by category
  const catalogByCategory = useMemo((): Record<string, TaskCatalogItem[]> => {
    const filtered = catalogSearch.trim()
      ? catalog.filter(item => {
          const name = i18n.language === 'es' ? item.name_es : item.name_en;
          return name.toLowerCase().includes(catalogSearch.toLowerCase());
        })
      : catalog;

    const groups: Record<string, TaskCatalogItem[]> = {};
    filtered.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [catalog, catalogSearch, i18n.language]);

  useEffect(() => {
    if (profiles.length > 0 && !assignedTo) {
      setValue('assignedTo', profiles[0].id);
    }
  }, [profiles, assignedTo]);

  function handleContinueFromTypeSelect() {
    setValue('type', selectedType);
    if (selectedType === 'task') {
      setStep('catalog');
    } else {
      setStep('form');
    }
  }

  function handleCatalogSelect(item: TaskCatalogItem) {
    setSelectedCatalogItem(item);
    const name = i18n.language === 'es' ? item.name_es : item.name_en;
    setValue('title', name);
    setValue('effortLevel', item.default_effort_level as EffortLevel);
    setValue('category', item.category as TaskCategory);
    setValue('catalogTaskId', item.id);
    if (item.default_time_of_day) {
      setValue('timeOfDay', item.default_time_of_day as TimeOfDay);
    }
    setCatalogSearch('');
    setStep('form');
  }

  function handleCustomTask() {
    setSelectedCatalogItem(null);
    setValue('catalogTaskId', undefined);
    setValue('title', '');
    setValue('effortLevel', 'M');
    setValue('timeOfDay', 'anytime');
    setValue('category', 'other');
    setStep('form');
  }

  function handleBackFromCatalog() {
    setStep('type-select');
    setCatalogSearch('');
  }

  function handleBackFromForm() {
    if (type === 'task') {
      setStep('catalog');
    } else {
      setStep('type-select');
    }
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
            date: getLocalDateString(instanceDate),
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

      const createdTasks = await createTasks(inputs);
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

  const labelClass = 'text-surface-2 text-sm font-semibold leading-normal pb-2';

  // ═══════════════════════════════════════════════════════════════
  //  STEP 1 — TYPE SELECTOR
  // ═══════════════════════════════════════════════════════════════
  if (step === 'type-select') {
    return (
      <div className="flex flex-col min-h-screen bg-background-dark">
        {/* Spacer to push content down like a bottom sheet */}
        <div className="flex-1" />

        <div className="flex flex-col items-center px-6 pb-10 pt-6 bg-surface-1 rounded-t-3xl border-t border-primary/10 relative">
          {/* Handle bar */}
          <div className="w-12 h-1.5 rounded-full bg-border-subtle mb-8" />

          {/* Title */}
          <h2 className="text-2xl font-bold text-surface-2 mb-2">
            {t('entryCreate.title')}
          </h2>
          <p className="text-sm text-surface-2/60 mb-8">
            {t('entryCreate.subtitle')}
          </p>

          {/* Type Cards */}
          <div className="flex gap-4 w-full max-w-xs mb-10">
            {/* Task Card */}
            <Button
              active={selectedType === 'task'}
              className="flex-1 h-auto flex-col gap-4 rounded-2xl border-2 p-6 shadow-lg shadow-primary/10"
              onClick={() => setSelectedType('task')}
              variant="selector"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                selectedType === 'task' ? 'bg-primary/20' : 'bg-primary/10'
              }`}>
                <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
              </div>
              <span className={`text-base font-bold ${selectedType === 'task' ? 'text-surface-2' : 'text-primary/70'}`}>
                {t('entryForm.typeTask')}
              </span>
            </Button>

            {/* Event Card */}
            <Button
              active={selectedType === 'event'}
              className="relative flex-1 h-auto flex-col gap-4 rounded-2xl border-2 p-6 shadow-lg shadow-primary/10"
              onClick={() => setSelectedType('event')}
              variant="selector"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                selectedType === 'event' ? 'bg-primary/20' : 'bg-primary/10'
              }`}>
                <span className="material-symbols-outlined text-primary/70 text-3xl">calendar_today</span>
              </div>
              <span className={`text-base font-bold ${selectedType === 'event' ? 'text-surface-2' : 'text-primary/70'}`}>
                {t('entryForm.typeEvent')}
              </span>
            </Button>
          </div>

          {/* Continue button */}
          <Button
            className="max-w-xs"
            endIcon={<span className="material-symbols-outlined text-xl">arrow_forward</span>}
            fullWidth
            onClick={handleContinueFromTypeSelect}
            size="lg"
          >
            {t('entryCreate.continue')}
          </Button>

          {/* Cancel */}
          <Button
            className="mt-4"
            onClick={() => router.history.back()}
            size="sm"
            variant="ghost"
          >
            {t('cta.cancel')}
          </Button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP 2 — TASK CATALOG
  // ═══════════════════════════════════════════════════════════════
  if (step === 'catalog') {
    return (
      <div className="flex flex-col min-h-screen bg-background-dark">
        <PageHeader
          title={t('entryCreate.selectTask')}
          subtitle={t('nav.calendar')}
          backAction={{
            onClick: handleBackFromCatalog,
          }}
        />

        <div className="flex flex-col gap-4 px-4 py-4 max-w-md mx-auto w-full flex-1">
          {/* Search bar */}
          <TextInput
            leading={<span className="material-symbols-outlined text-primary/40">search</span>}
            placeholder={t('entryForm.catalogSearch')}
            size="lg"
            type="text"
            value={catalogSearch}
            variant="soft"
            onChange={(e) => setCatalogSearch(e.target.value)}
          />

          {/* Catalog grouped by category */}
          <div className="flex flex-col gap-5 pb-4 overflow-y-auto flex-1">
            {(Object.entries(catalogByCategory) as [string, TaskCatalogItem[]][]).map(([cat, items]) => (
              <div key={cat} className="flex flex-col gap-2">
                {/* Category header */}
                <div className="flex items-center gap-2 px-1 pt-1">
                  <span className="text-base">{CATEGORY_ICONS[cat] || '📦'}</span>
                  <span className="text-xs font-bold text-primary/50 uppercase tracking-wider">
                    {t(`entryForm.categories.${cat}` as const)}
                  </span>
                </div>

                {/* Category items */}
                {items.map(item => {
                  const name = i18n.language === 'es' ? item.name_es : item.name_en;
                  const points = EFFORT_POINTS[item.default_effort_level as EffortLevel] ?? 0;
                  return (
                    <Button
                      key={item.id}
                      className="h-auto justify-start gap-3 border-primary/15 px-4 py-3.5 text-left"
                      fullWidth
                      onClick={() => handleCatalogSelect(item)}
                      variant="subtle"
                    >
                      <span className="text-xl w-8 text-center shrink-0">{item.icon}</span>
                      <span className="flex-1 text-surface-2 text-sm font-medium truncate">{name}</span>
                      <Badge className="shrink-0 whitespace-nowrap" size="md" tone="primary">
                        {item.default_effort_level} · {points}pts
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            ))}

            {/* Create custom task */}
            <Button
              className="mt-2 h-auto justify-start gap-3 border-dashed border-primary/30 px-4 py-4"
              fullWidth
              onClick={handleCustomTask}
              variant="subtle"
            >
              <span className="text-xl w-8 text-center">✏️</span>
              <span className="flex-1 text-sm font-semibold text-primary/80">{t('entryForm.createCustomTask')}</span>
              <span className="material-symbols-outlined text-primary/40 text-xl">arrow_forward</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP 3 — FORM (Task or Event)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col min-h-screen bg-background-dark">
      <PageHeader
        title={t('entryCreate.title')}
        subtitle={type === 'task' ? t('entryForm.typeTask') : t('entryForm.typeEvent')}
        backAction={{
          onClick: handleBackFromForm,
        }}
        rightSlot={(
          <Button
            aria-label={t('topBar.save')}
            className="min-h-10 justify-end px-0 text-base font-bold tracking-[0.015em] text-primary disabled:text-primary/40"
            loading={saving}
            onClick={handleSubmit(onSubmit)}
            size="sm"
            variant="ghost"
          >
            {t('cta.save')}
          </Button>
        )}
      />

      <div className="flex flex-col gap-6 px-4 py-4 max-w-md mx-auto w-full">
        {/* ── Selected catalog item badge ── */}
        {type === 'task' && selectedCatalogItem && (
          <Card className="flex items-center gap-3" padding="sm" radius="xl" variant="info">
            <span className="text-xl">{selectedCatalogItem.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-surface-2 text-sm font-semibold truncate">
                {i18n.language === 'es' ? selectedCatalogItem.name_es : selectedCatalogItem.name_en}
              </p>
              <p className="text-surface-2/60 text-xs">
                {t(`entryForm.categories.${selectedCatalogItem.category}` as const)}
              </p>
            </div>
            <Button
              className="size-8 p-0 text-primary/50 hover:text-primary/80"
              onClick={() => { setSelectedCatalogItem(null); setStep('catalog'); }}
              size="icon"
              variant="icon"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </Button>
          </Card>
        )}

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

        {/* ── Category (task only, when custom) ── */}
        {type === 'task' && !selectedCatalogItem && (
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
              <div className="h-full w-[27px] rounded-full bg-background-light shadow-md"></div>
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
                      <div className="h-full w-[27px] rounded-full bg-background-light shadow-md"></div>
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
