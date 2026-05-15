import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfiles } from '../../api/profiles';
import {
  useEquityBalance,
  usePointsBreakdown,
  useWeeklyPulse,
  metricKeys,
} from '../../api/metrics';
import { profileKeys } from '../../api/profiles';
import { useTranslation } from 'react-i18next';
import PageHeader from '../ui/PageHeader';
import DataStatusBanner from '../ui/DataStatusBanner';
import QueryErrorState from '../ui/QueryErrorState';
import FullPageLoading from '../ui/FullPageLoading';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import BalanceScoreWidget from '../ui/BalanceScoreWidget';
import { useAuthScope } from '@/src/context/AuthContext';

export default function Metrics() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();
  const isOnline = useOnlineStatus();

  const profilesQuery = useProfiles();
  const balanceQuery = useEquityBalance();
  const pulseQuery = useWeeklyPulse();
  const pointsQuery = usePointsBreakdown();

  const balance = balanceQuery.data ?? null;
  const pulse = pulseQuery.data ?? null;
  const points = pointsQuery.data ?? [];
  const loading =
    profilesQuery.isLoading ||
    balanceQuery.isLoading ||
    pulseQuery.isLoading ||
    pointsQuery.isLoading;
  const hasQueryError =
    profilesQuery.isError ||
    balanceQuery.isError ||
    pulseQuery.isError ||
    pointsQuery.isError;
  const isStale =
    profilesQuery.isStale ||
    balanceQuery.isStale ||
    pulseQuery.isStale ||
    pointsQuery.isStale;
  const isFetching =
    profilesQuery.isFetching ||
    balanceQuery.isFetching ||
    pulseQuery.isFetching ||
    pointsQuery.isFetching;

  if (loading) {
    return <FullPageLoading message={t('loading')} />;
  }


  if (hasQueryError && !balance && points.length === 0) {
    return (
      <QueryErrorState
        onRetry={() => {
          if (!householdId) return;

          void Promise.all([
            queryClient.refetchQueries({ queryKey: profileKeys.all(householdId!) }),
            queryClient.refetchQueries({ queryKey: metricKeys.equity(householdId!) }),
            queryClient.refetchQueries({ queryKey: metricKeys.weeklyPulse(householdId!) }),
            queryClient.refetchQueries({ queryKey: metricKeys.pointsBreakdown(householdId!) }),
          ]);
        }}
      />
    );
  }

  const maxPoints = Math.max(...points.map((p) => p.totalPoints), 1);
  const weeklyDelta = pulse?.changeFromLastWeek ?? 0;
  const weeklyDeltaDisplay = `${weeklyDelta >= 0 ? '+' : ''}${weeklyDelta}`;

  return (
    <div className="flex flex-col min-h-screen bg-background-dark">
      <PageHeader title={t('metrics.title')} subtitle={t('nav.metrics')} />

      <main className="custom-scrollbar max-w-md mx-auto w-full pb-20">
        <div className="px-4 pt-2">
          <DataStatusBanner isOffline={!isOnline} isStale={isStale} isFetching={isFetching} />
        </div>

        {/* House Harmony */}
        <section className="px-4 mt-2">
          <BalanceScoreWidget compact={false} />
        </section>

        {/* Weekly Pulse */}
        <section className="px-4 py-2 mt-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-surface-2/60 mb-3 ml-1">{t('metrics.weeklyPulse')}</h4>
          <div className="bg-surface-1 border border-border-subtle p-4 rounded-xl">
            <p className="text-xs text-surface-2/60 mb-1">{t('metrics.weeklyTasksCompleted')}</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-surface-2">{pulse?.completedThisWeek ?? 0}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                weeklyDelta >= 0
                  ? 'bg-primary/20 text-primary'
                  : 'bg-danger/20 text-danger'
              }`}>
                {t('metrics.thisWeekDelta', { delta: weeklyDeltaDisplay })}
              </span>
            </div>
          </div>
        </section>

        {/* Points Breakdown */}
        <section className="px-4 mt-6">
          <h4 className="text-sm font-bold uppercase tracking-wider text-surface-2/60 mb-3 ml-1">{t('metrics.pointsReceived')}</h4>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <div className="space-y-4">
              {points.map((p, i) => {
                const taskPercent = p.totalPoints > 0 ? (p.taskPoints / p.totalPoints) * 100 : 0;
                const kudosPercent = p.totalPoints > 0 ? (p.kudosPoints / p.totalPoints) * 100 : 0;
                const barWidth = (p.totalPoints / maxPoints) * 100;
                const isFirst = i === 0;
                return (
                  <div key={p.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center text-[11px] font-bold text-primary">
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt={p.name} className="size-full object-cover" />
                          ) : (
                            p.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="text-sm font-medium text-surface-2">{p.name}</span>
                      </div>
                      <span className={`text-sm font-bold ${isFirst ? 'text-primary' : 'text-surface-2/60'}`}>{t('metrics.pointsShort', { value: p.totalPoints })}</span>
                    </div>
                    <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full ${isFirst ? 'bg-primary' : 'bg-primary opacity-80'}`}
                        style={{ width: `${taskPercent * barWidth / 100}%` }}
                      ></div>
                      <div
                        className={`h-full ${isFirst ? 'bg-primary/40' : 'bg-primary/20'}`}
                        style={{ width: `${kudosPercent * barWidth / 100}%` }}
                      ></div>
                    </div>
                    <p className={`text-[10px] mt-1.5 font-medium ${isFirst ? 'text-primary/60' : 'text-surface-2/40'}`}>
                      {t('metrics.pointsBreakdown', { taskPoints: p.taskPoints, kudosPoints: p.kudosPoints })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Send Kudos CTA */}
        <section className="px-4 mt-4 mb-8">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 border border-primary/20">
            <div className="relative z-10">
              <h5 className="font-bold text-primary mb-2">{t('metrics.feelingGrateful')}</h5>
              <p className="text-sm text-surface-2/80 mb-4">{t('metrics.sendThanksDescription')}</p>
              <button className="bg-primary hover:bg-primary/90 text-surface-1 font-bold py-2 px-6 rounded-lg text-sm transition-colors">
                {t('metrics.sendKudos')}
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-[120px] text-primary">celebration</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
