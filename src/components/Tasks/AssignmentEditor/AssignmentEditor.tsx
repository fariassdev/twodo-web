import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Profile, TaskCompletionWithProfile } from '../../../lib/types';
import type { TaskAssignmentOverrideType } from '../../../lib/queries';
import AssignmentSelector, { type AssignmentSelection } from '../AssignmentSelector';

interface AssignmentEditorProps {
  open: boolean;
  profiles: Profile[];
  completions: TaskCompletionWithProfile[];
  defaultAssignmentType: 'strict_rotation' | TaskAssignmentOverrideType;
  defaultAssignedTo: string | null;
  value: AssignmentSelection;
  onChange: (nextValue: AssignmentSelection) => void;
  onSave: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function AssignmentEditor(props: Readonly<AssignmentEditorProps>) {
  const { t } = useTranslation();
  const { completions } = props;

  return (
    <>
      {props.open && (
        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h4 className="mb-2 text-sm font-bold text-slate-300">{t('taskCompletion.currentAssignment')}</h4>
          {completions.length === 0 ? (
            <p className="text-xs text-slate-400">{t('taskDetails.none')}</p>
          ) : (
            <ul className="space-y-1">
              {completions.map((completion) => (
                <li key={completion.id} className="text-sm text-slate-200">
                  {completion.profile?.name ?? completion.completed_by}: +{completion.points_earned}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <AssignmentSelector
        open={props.open}
        title={t('taskCompletion.editAssignment')}
        confirmLabel={t('taskCompletion.saveAssignment')}
        defaultAssignmentType={props.defaultAssignmentType}
        defaultAssignedTo={props.defaultAssignedTo}
        profiles={props.profiles}
        value={props.value}
        onChange={props.onChange}
        onConfirm={props.onSave}
        onCancel={props.onCancel}
        loading={props.loading}
      />
    </>
  );
}
