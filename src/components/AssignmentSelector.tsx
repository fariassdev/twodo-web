import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Profile } from '../lib/types';
import type { TaskAssignmentOverrideType } from '../lib/queries';

export interface AssignmentSelection {
  type: TaskAssignmentOverrideType;
  assignedTo: string[];
}

interface AssignmentSelectorProps {
  open: boolean;
  defaultAssignmentType: 'strict_rotation' | TaskAssignmentOverrideType;
  defaultAssignedTo: string | null;
  profiles: Profile[];
  value: AssignmentSelection;
  onChange: (nextValue: AssignmentSelection) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
  confirmLabel?: string;
}

export default function AssignmentSelector({
  open,
  defaultAssignmentType,
  defaultAssignedTo,
  profiles,
  value,
  onChange,
  onConfirm,
  onCancel,
  loading = false,
  title,
  confirmLabel,
}: Readonly<AssignmentSelectorProps>) {
  const { t } = useTranslation();

  const defaultSelection = useMemo<AssignmentSelection>(() => {
    if (defaultAssignmentType === 'team_work') {
      return { type: 'team_work', assignedTo: [] };
    }
    if (defaultAssignmentType === 'anyone') {
      return { type: 'anyone', assignedTo: [] };
    }
    return {
      type: 'individual',
      assignedTo: [defaultAssignedTo ?? profiles[0]?.id ?? ''].filter(Boolean),
    };
  }, [defaultAssignedTo, defaultAssignmentType, profiles]);

  if (!open) return null;

  const selectedIndividualId = value.assignedTo[0] ?? profiles[0]?.id ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden flex flex-col pointer-events-auto z-10">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-bold text-slate-100 mb-2">
            {title ?? t('taskCompletion.selectAssignment')}
          </h3>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <button
            type="button"
            onClick={() => onChange(defaultSelection)}
            className="w-full rounded-xl border border-slate-700 p-3 text-left hover:bg-slate-700/50"
          >
            <p className="text-sm font-semibold text-slate-100">{t('taskCompletion.defaultAssignment')}</p>
            <p className="text-xs text-slate-400">{t(`taskDetails.assignment.${defaultAssignmentType === 'strict_rotation' ? 'strictRotation' : defaultAssignmentType === 'team_work' ? 'teamWork' : defaultAssignmentType}`)}</p>
          </button>

          <button
            type="button"
            onClick={() => onChange({ type: 'team_work', assignedTo: [] })}
            className={`w-full rounded-xl border p-3 text-left ${
              value.type === 'team_work' ? 'border-primary bg-primary/10' : 'border-slate-700'
            }`}
          >
            <p className="text-sm font-semibold text-slate-100">{t('taskCompletion.teamWork')}</p>
          </button>

          <div
            className={`w-full rounded-xl border p-3 text-left ${
              value.type === 'individual' ? 'border-primary bg-primary/10' : 'border-slate-700'
            }`}
          >
            <button
              type="button"
              onClick={() => onChange({ type: 'individual', assignedTo: [selectedIndividualId || profiles[0]?.id || ''] })}
              className="w-full text-left"
            >
              <p className="text-sm font-semibold text-slate-100">{t('taskCompletion.individual')}</p>
            </button>
            <select
              value={selectedIndividualId}
              onChange={(event) => onChange({ type: 'individual', assignedTo: [event.target.value] })}
              className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => onChange({ type: 'anyone', assignedTo: [] })}
            className={`w-full rounded-xl border p-3 text-left ${
              value.type === 'anyone' ? 'border-primary bg-primary/10' : 'border-slate-700'
            }`}
          >
            <p className="text-sm font-semibold text-slate-100">{t('taskCompletion.anyone')}</p>
          </button>
        </div>

        <div className="flex flex-col border-t border-slate-700 divide-y divide-slate-700">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="p-4 text-center text-slate-100 hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? t('taskDetails.processing') : (confirmLabel ?? t('taskCompletion.confirmAssignment'))}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-4 text-center text-slate-400 hover:bg-slate-700 transition-colors font-medium bg-slate-800/50"
          >
            {t('cta.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
