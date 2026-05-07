import { useTranslation } from 'react-i18next';
import type { Profile, TaskCompletionWithProfile } from '../../../lib/types';
import AssignmentSelector, { type AssignmentSelection } from '../AssignmentSelector';

interface AssignmentEditorProps {
  open: boolean;
  profiles: Profile[];
  completions: TaskCompletionWithProfile[];
  value: AssignmentSelection;
  onChange: (nextValue: AssignmentSelection) => void;
  onSave: () => void;
  onCancel: () => void;
  loading?: boolean;
  subtitle?: string;
}

export default function AssignmentEditor(props: Readonly<AssignmentEditorProps>) {
  const { t } = useTranslation();

  return (
    <AssignmentSelector
      open={props.open}
      title={t('taskCompletion.editAssignment')}
      confirmLabel={t('taskCompletion.saveAssignment')}
      profiles={props.profiles}
      value={props.value}
      onChange={props.onChange}
      onConfirm={props.onSave}
      onCancel={props.onCancel}
      loading={props.loading}
      subtitle={props.subtitle}
    />
  );
}
