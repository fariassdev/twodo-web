import React, { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useAuthScope,
  useSwapDatasetQuery,
  useSwapTasksMutation,
} from '../lib/queryHooks';
import { buildSwapOptions, findPartnerConflict } from '../lib/swapRanking';
import TopBar from './ui/TopBar';
import QueryErrorState from './ui/QueryErrorState';
import type { Task } from '../lib/types';

// ---------------------------------------------------------------------------
// Icon helper (reuses app pattern from Dashboard)
// ---------------------------------------------------------------------------
const TASK_ICONS: Record<string, string> = {
  mercadona: 'shopping_cart',
  compra: 'shopping_cart',
  limpi: 'cleaning_services',
  cocina: 'restaurant',
  basura: 'delete',
  planch: 'iron',
  perro: 'pets',
  lavar: 'water_drop',
};

function getTaskIcon(task: Task): string {
  const haystack = `${task.title} ${task.location ?? ''}`.toLowerCase();
  for (const [keyword, icon] of Object.entries(TASK_ICONS)) {
    if (haystack.includes(keyword)) return icon;
  }
  return 'task_alt';
}

// ---------------------------------------------------------------------------
// TaskCard – used for the "your task" / "new task" comparison cards
// ---------------------------------------------------------------------------
interface TaskCardProps {
  task: Task;
  label: string;
  labelColor: string;
}

function TaskCard({ task, label, labelColor }: TaskCardProps) {
  const { t } = useTranslation();
  const icon = getTaskIcon(task);

  return (
    <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3 min-w-0">
      <div className="bg-primary/20 rounded-xl flex items-center justify-center h-20">
        <span className="material-symbols-outlined text-4xl text-primary">{icon}</span>
      </div>
      <div>
        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${labelColor}`}>{label}</p>
        <p className="font-bold text-base leading-tight">{task.title}</p>
        <div className="flex items-center gap-1 mt-1 text-slate-400">
          <span className="material-symbols-outlined text-sm text-primary">star</span>
          <span className="text-sm font-medium text-primary">{t('swap.pts', { count: task.points ?? 10 })}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CandidateRow – list item for perfect match & alternatives
// ---------------------------------------------------------------------------
interface CandidateRowProps {
  task: Task;
  selected: boolean;
  onSelect: () => void;
}

const CandidateRow: React.FC<CandidateRowProps> = ({ task, selected, onSelect }) => {
  const { t, i18n } = useTranslation();
  const icon = getTaskIcon(task);

  const dateLabel = task.date
    ? new Date(task.date + 'T12:00:00').toLocaleDateString(i18n.language, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;

  const timeLabel = task.start_time
    ? `${task.start_time.slice(0, 5)}${t('common.hourSuffix')}`
    : null;

  const dateTime = [dateLabel, timeLabel].filter(Boolean).join(', ');

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98] text-left ${
        selected
          ? 'bg-primary/15 border-primary/60'
          : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-primary/30' : 'bg-slate-700/60'}`}>
        <span className={`material-symbols-outlined text-2xl ${selected ? 'text-primary' : 'text-slate-400'}`}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-bold text-sm truncate">{task.title}</p>
          {selected && <span className="material-symbols-outlined text-primary text-base">check_circle</span>}
        </div>
        {dateTime && <p className="text-slate-400 text-xs mt-0.5">{dateTime}</p>}
      </div>
      <span className={`text-sm font-bold flex-shrink-0 ${selected ? 'text-primary' : 'text-yellow-400'}`}>
        {t('swap.pts', { count: task.points ?? 10 })}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main SwapPicker screen
// ---------------------------------------------------------------------------
export default function SwapPicker() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { taskId } = useParams({ strict: false }) as { taskId: string };
  const { profileId, householdId } = useAuthScope();

  const datasetQuery = useSwapDatasetQuery(taskId);
  const swapMutation = useSwapTasksMutation();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const dataset = datasetQuery.data;

  const today = new Date().toISOString().split('T')[0];

  const { perfectMatch, alternatives } = React.useMemo(() => {
    if (!dataset || !profileId) return { perfectMatch: null, alternatives: [] };
    return buildSwapOptions(
      dataset.originTask,
      dataset.partnerTasks,
      dataset.myBusyTasks,
      dataset.partnerProfile.id,
      today,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, profileId]);

  const partnerConflict = React.useMemo(() => {
    if (!dataset) return null;
    return findPartnerConflict(dataset.originTask, dataset.partnerBusyTasks);
  }, [dataset]);

  const selectedTask = React.useMemo(() => {
    if (!selectedTaskId || !dataset) return null;
    return dataset.partnerTasks.find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, dataset]);

  async function handleConfirm() {
    if (!selectedTask || !dataset || !profileId || !householdId) return;
    setActionError(null);
    try {
      await swapMutation.mutateAsync({
        myTaskId: dataset.originTask.id,
        partnerTaskId: selectedTask.id,
        myProfileId: profileId,
        partnerProfileId: dataset.partnerProfile.id,
        householdId,
      });
      navigate({
        to: '/task/$taskId/swap/success',
        params: { taskId },
        search: {
          myTaskTitle: dataset.originTask.title,
          partnerTaskTitle: selectedTask.title,
          partnerName: dataset.partnerProfile.name,
        },
      });
    } catch (err) {
      console.error('Swap error:', err);
      setActionError(t('queryState.mutationError'));
    }
  }

  // Loading state
  if (datasetQuery.isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (datasetQuery.isError || !dataset) {
    return (
      <QueryErrorState onRetry={() => void datasetQuery.refetch()} />
    );
  }

  const hasOptions = perfectMatch !== null || alternatives.length > 0;

  return (
    <div className="flex flex-col min-h-screen pb-36">
      <TopBar
        title={t('swap.title')}
        leftAction={{
          ariaLabel: t('topBar.back'),
          icon: 'arrow_back',
          onClick: () => navigate({ to: '/task/$taskId', params: { taskId } }),
        }}
        rightMenu={undefined}
      />

      <main className="flex-1 px-4 max-w-md mx-auto w-full pt-4 space-y-6">
        {/* Error */}
        {actionError && (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100">
            {actionError}
          </p>
        )}

        {/* Partner busy warning */}
        {partnerConflict && (
          <div className="flex gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-3">
            <span className="material-symbols-outlined text-yellow-400 text-lg flex-shrink-0 mt-0.5">warning</span>
            <p className="text-yellow-200 text-xs leading-relaxed">
              {t('swap.partnerBusyWarning', {
                name: dataset.partnerProfile.name,
                conflict: partnerConflict.title,
              })}
            </p>
          </div>
        )}

        {/* Current comparison */}
        <section>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">{t('swap.currentComparison')}</p>
          <div className="flex gap-3">
            <TaskCard task={dataset.originTask} label={t('swap.yourTask')} labelColor="text-primary" />
            {selectedTask ? (
              <TaskCard task={selectedTask} label={t('swap.newTask')} labelColor="text-yellow-400" />
            ) : (
              <div className="flex-1 bg-slate-800/30 border border-dashed border-slate-600 rounded-2xl flex items-center justify-center h-32 text-slate-500 text-sm text-center px-3">
                {t('swap.selectHint')}
              </div>
            )}
          </div>
        </section>

        {/* No options state */}
        {!hasOptions && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-600">swap_horiz</span>
            <p className="text-slate-400 text-sm max-w-xs">{t('swap.noOptions', { name: dataset.partnerProfile.name })}</p>
          </div>
        )}

        {/* Perfect Match */}
        {perfectMatch && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-xl">verified</span>
              <h2 className="font-bold text-lg">Perfect Match</h2>
              <span className="text-slate-400 text-sm">({t('swap.sameValue')})</span>
            </div>
            <CandidateRow
              task={perfectMatch}
              selected={selectedTaskId === perfectMatch.id}
              onSelect={() => setSelectedTaskId(perfectMatch.id)}
            />
          </section>
        )}

        {/* Other options */}
        {alternatives.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-slate-400 text-xl">list</span>
              <h2 className="font-bold text-lg">{t('swap.otherOptions')}</h2>
              <span className="text-slate-400 text-sm">({t('swap.similarValue')})</span>
            </div>
            <div className="space-y-2">
              {alternatives.map((candidate) => (
                <CandidateRow
                  key={candidate.id}
                  task={candidate}
                  selected={selectedTaskId === candidate.id}
                  onSelect={() => setSelectedTaskId(candidate.id)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Fixed confirm button */}
      {hasOptions && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent">
          <button
            onClick={() => void handleConfirm()}
            disabled={!selectedTaskId || swapMutation.isPending}
            className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-primary text-background-dark h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {swapMutation.isPending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-background-dark border-t-transparent" />
            ) : (
              <>
                <span className="material-symbols-outlined font-bold">check_circle</span>
                {t('swap.confirmSwap')}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
