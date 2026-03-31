import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Profile } from '../lib/types';
import type { TaskAssignmentOverrideType } from '../lib/queries';
import Button from './ui/Button';
import Card from './ui/Card';
import SelectInput from './ui/SelectInput';

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
      <Card className="relative z-10 w-full max-w-sm overflow-hidden pointer-events-auto flex flex-col" padding="none" variant="modal">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-bold text-slate-100 mb-2">
            {title ?? t('taskCompletion.selectAssignment')}
          </h3>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <Button className="h-auto rounded-xl p-3" fullWidth onClick={() => onChange(defaultSelection)} variant="selector">
            <p className="text-sm font-semibold text-slate-100">{t('taskCompletion.defaultAssignment')}</p>
            <p className="text-xs text-slate-400">{t(`taskDetails.assignment.${defaultAssignmentType === 'strict_rotation' ? 'strictRotation' : defaultAssignmentType === 'team_work' ? 'teamWork' : defaultAssignmentType}`)}</p>
          </Button>

          <Button
            active={value.type === 'team_work'}
            className="h-auto rounded-xl p-3"
            fullWidth
            onClick={() => onChange({ type: 'team_work', assignedTo: [] })}
            variant="selector"
          >
            <p className="text-sm font-semibold text-slate-100">{t('taskCompletion.teamWork')}</p>
          </Button>

          <div
            className={`w-full rounded-xl border p-3 text-left ${
              value.type === 'individual' ? 'border-primary bg-primary/10' : 'border-slate-700'
            }`}
          >
            <Button
              className="h-auto px-0 py-0"
              fullWidth
              onClick={() => onChange({ type: 'individual', assignedTo: [selectedIndividualId || profiles[0]?.id || ''] })}
              size="sm"
              variant="ghost"
            >
              <p className="text-sm font-semibold text-slate-100">{t('taskCompletion.individual')}</p>
            </Button>
            <SelectInput
              className="mt-2"
              selectClassName="text-sm"
              value={selectedIndividualId}
              variant="slate"
              onChange={(event) => onChange({ type: 'individual', assignedTo: [event.target.value] })}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </SelectInput>
          </div>

          <Button
            active={value.type === 'anyone'}
            className="h-auto rounded-xl p-3"
            fullWidth
            onClick={() => onChange({ type: 'anyone', assignedTo: [] })}
            variant="selector"
          >
            <p className="text-sm font-semibold text-slate-100">{t('taskCompletion.anyone')}</p>
          </Button>
        </div>

        <div className="flex flex-col border-t border-slate-700 divide-y divide-slate-700">
          <Button fullWidth loading={loading} onClick={onConfirm} size="menu" variant="modalAction">
            {loading ? t('taskDetails.processing') : (confirmLabel ?? t('taskCompletion.confirmAssignment'))}
          </Button>
          <Button className="bg-slate-800/50 text-slate-400" fullWidth onClick={onCancel} size="menu" variant="modalAction">
            {t('cta.cancel')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
