import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Profile } from '../../../../lib/types';
import type { TaskAssignmentOverrideType } from '../../../../api';
import Button from '../../../ui/Button';
import PageHeader from '../../../ui/PageHeader';

export interface AssignmentSelection {
  type: TaskAssignmentOverrideType;
  assignedTo: string[];
}

interface AssignmentSelectorProps {
  open: boolean;
  profiles: Profile[];
  value: AssignmentSelection;
  onChange: (nextValue: AssignmentSelection) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  children?: React.ReactNode;
}

export default function AssignmentSelector({
  open,
  profiles,
  value,
  onChange,
  onConfirm,
  onCancel,
  loading = false,
  title,
  subtitle,
  confirmLabel,
  children,
}: Readonly<AssignmentSelectorProps>) {
  const { t } = useTranslation();

  const selectedDist = useMemo(() => {
    if (value.type === 'team_work') {
      return profiles.map((p) => ({ id: p.id, name: p.name, percentage: 50 }));
    }
    return profiles.map((p) => ({
      id: p.id,
      name: p.name,
      percentage: value.assignedTo.includes(p.id) ? 100 : 0,
    }));
  }, [value, profiles]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background-dark animate-in fade-in slide-in-from-right duration-300">
      <PageHeader
        title={subtitle ?? ''}
        subtitle={title ?? t('taskCompletion.selectAssignment')}
        backAction={{
          onClick: onCancel,
          ariaLabel: t('cta.cancel'),
        }}
        showAvatars={false}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-md mx-auto w-full px-6 pt-6 pb-24">
          {children && <div className="mb-8">{children}</div>}

          {/* Integrated Selection Visualization */}
          <div className="mb-10 bg-primary/5 border border-primary/10 rounded-2xl p-4">
             <div className="flex justify-between items-center mb-3">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">
                 {t('taskCompletion.pointDistribution', 'Distribution')}
               </span>
               <div className="flex gap-4">
                 {selectedDist.map((d, i) => (
                   <div key={d.id} className="flex items-center gap-1.5">
                     <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-primary/30'}`} />
                     <span className={`text-[9px] font-bold uppercase tracking-tight ${d.percentage > 0 ? 'text-surface-2/60' : 'text-surface-2/20'}`}>
                       {d.name} {d.percentage}%
                     </span>
                   </div>
                 ))}
               </div>
             </div>
             <div className="h-1.5 w-full bg-primary/5 rounded-full overflow-hidden flex ring-1 ring-primary/5">
                {selectedDist.map((d, i) => (
                  <div
                    key={d.id}
                    className={`h-full transition-all duration-500 ${i === 0 ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]' : 'bg-primary/30'}`}
                    style={{ width: `${d.percentage}%` }}
                  />
                ))}
             </div>
          </div>

          <p className="text-xs font-black text-surface-2/30 uppercase tracking-[0.2em] mb-8 text-center">
            {t('taskCompletion.whoGetsPoints', 'Who should receive the points?')}
          </p>

          <div className="space-y-6">
            {/* Team Work Option - Full Width */}
            <button
              type="button"
              onClick={() => onChange({ type: 'team_work', assignedTo: [] })}
              className={`relative flex items-center p-6 rounded-[32px] transition-all duration-300 group w-full ${
                value.type === 'team_work'
                  ? 'bg-primary/10 ring-2 ring-primary shadow-glow-primary/20'
                  : 'bg-surface-1/40 border border-border-subtle hover:bg-surface-1 hover:border-primary/30'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 mr-4 ${
                value.type === 'team_work' ? 'bg-primary text-surface-1 shadow-glow-primary scale-105' : 'bg-surface-2/5 text-surface-2/40 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <span className="material-symbols-outlined text-3xl filled-icon">groups</span>
              </div>
              <div className="flex flex-col text-left">
                <span className={`text-base font-bold tracking-tight ${value.type === 'team_work' ? 'text-primary' : 'text-surface-2'}`}>
                  {t('taskCompletion.teamWork')}
                </span>
                <span className="text-xs text-surface-2/40">{t('taskCompletion.splitPoints', 'Split points between both')}</span>
              </div>
              {value.type === 'team_work' && (
                <div className="ml-auto w-6 h-6 bg-primary text-surface-1 rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                  <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                </div>
              )}
            </button>

            <div className="grid grid-cols-2 gap-4">
              {/* Individual Profiles */}
              {profiles.map((profile) => {
                const isSelected = (value.type === 'individual' || value.type === 'anyone') && value.assignedTo[0] === profile.id;

                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => onChange({ type: 'individual', assignedTo: [profile.id] })}
                    className={`relative flex flex-col items-center justify-center p-6 rounded-[32px] transition-all duration-300 group ${
                      isSelected
                        ? 'bg-primary/10 ring-2 ring-primary shadow-glow-primary/20'
                        : 'bg-surface-1/40 border border-border-subtle hover:bg-surface-1 hover:border-primary/30'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-2xl overflow-hidden transition-all duration-300 mb-3 border-2 ${
                      isSelected ? 'border-primary shadow-glow-primary scale-110' : 'border-surface-2/10 group-hover:border-primary/30'
                    }`}>
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.name || ''} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-xl font-bold ${
                          isSelected ? 'bg-primary text-surface-1' : 'bg-surface-2/5 text-surface-2/40'
                        }`}>
                          {profile.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-bold tracking-tight ${isSelected ? 'text-primary' : 'text-surface-2/60'}`}>
                      {profile.name}
                    </span>
                    

                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-primary text-surface-1 rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                        <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 p-4 pb-10 bg-background-dark/80 backdrop-blur-xl border-t border-border-subtle shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        <div className="max-w-md mx-auto w-full">
          <Button 
            className="h-16 shadow-glow-primary text-lg rounded-2xl" 
            fullWidth
            loading={loading} 
            onClick={onConfirm} 
            variant="primary"
          >
            {loading ? t('taskDetails.processing') : (confirmLabel ?? t('taskCompletion.confirmAssignment'))}
          </Button>
        </div>
      </div>
    </div>
  );
}





