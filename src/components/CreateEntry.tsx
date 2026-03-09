import React, { useState, useEffect } from 'react';
import { createTask, createTasks, getProfiles } from '../lib/queries';
import type { CreateTaskInput } from '../lib/queries';
import type { Profile } from '../lib/types';
import { useTranslation } from 'react-i18next';

import { useNavigate, useSearch, useRouter } from '@tanstack/react-router';

export default function CreateEntry() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const searchParams = useSearch({ strict: false }) as { date?: string };
  const initialDate = searchParams?.date;
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [points, setPoints] = useState(10);
  const [priority, setPriority] = useState<'critical' | 'flexible'>('critical');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [type, setType] = useState<'task' | 'event'>('task');
  const [assignmentCategory, setAssignmentCategory] = useState<'team_work' | 'individual'>('team_work');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [isRotating, setIsRotating] = useState(false);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    getProfiles().then(setProfiles);
  }, []);

  useEffect(() => {
    if (profiles.length > 0 && !assignedTo) {
      setAssignedTo(profiles[0].id);
    }
  }, [profiles, assignedTo]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const finalAssignmentType: 'team_work' | 'strict_rotation' | 'individual' = assignmentCategory === 'team_work' 
        ? 'team_work' 
        : (isRotating ? 'strict_rotation' : 'individual');

      const baseInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority: type === 'task' ? priority : 'flexible',
        points: type === 'task' ? points : 0,
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : null,
        assignment_type: finalAssignmentType,
        assigned_to: assignmentCategory === 'team_work' ? undefined : assignedTo,
        location: location.trim() || undefined,
      };

      let inputs: CreateTaskInput[] = [];

      if (isRecurring && frequency && date) {
        const recurrenceId = crypto.randomUUID();
        const baseDate = new Date(date);
        let instancesCount = frequency === 'daily' ? 365 : frequency === 'weekly' ? 52 : 12;

        let currentAssignedTo = assignedTo;

        for (let i = 0; i < instancesCount; i++) {
          const instanceDate = new Date(baseDate);
          if (frequency === 'daily') {
            instanceDate.setDate(instanceDate.getDate() + i);
          } else if (frequency === 'weekly') {
            instanceDate.setDate(instanceDate.getDate() + i * 7);
          } else if (frequency === 'monthly') {
            instanceDate.setMonth(instanceDate.getMonth() + i);
          }
          inputs.push({
            ...baseInput,
            assigned_to: assignmentCategory === 'team_work' ? undefined : currentAssignedTo,
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
          date: date || undefined,
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
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-dark">
      <div className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-background-dark z-10 max-w-md mx-auto w-full">
        <div onClick={() => router.history.back()} className="text-slate-100 flex size-12 shrink-0 items-center justify-start cursor-pointer">
          <span className="material-symbols-outlined">close</span>
        </div>
        <h2 className="text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t('entryCreate.title')}</h2>
        <div onClick={handleSave} className="flex w-12 items-center justify-end cursor-pointer">
          <p className={`text-base font-bold leading-normal tracking-[0.015em] shrink-0 ${saving ? 'text-primary/40' : 'text-primary'}`}>
            {saving ? t('common.saving') : t('cta.save')}
          </p>
        </div>
      </div>

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
