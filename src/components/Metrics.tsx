import React from 'react';
import {
  useAuthContextQuery,
  useEquityBalanceQuery,
  usePointsBreakdownQuery,
  useProfilesQuery,
  useWeeklyPulseQuery,
} from '../lib/queryHooks';
import { useTranslation } from 'react-i18next';
import TopBar from './ui/TopBar';
import DataStatusBanner from './ui/DataStatusBanner';
import QueryErrorState from './ui/QueryErrorState';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function Metrics() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  const authContextQuery = useAuthContextQuery();
  const profilesQuery = useProfilesQuery();
  const balanceQuery = useEquityBalanceQuery(profilesQuery.data);
  const pulseQuery = useWeeklyPulseQuery();
  const pointsQuery = usePointsBreakdownQuery(profilesQuery.data);

  const balance = balanceQuery.data ?? null;
  const pulse = pulseQuery.data ?? null;
  const points = pointsQuery.data ?? [];
  const loading =
    authContextQuery.isPending ||
    profilesQuery.isPending ||
    balanceQuery.isPending ||
    pulseQuery.isPending ||
    pointsQuery.isPending;
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (hasQueryError && !balance && points.length === 0) {
    return (
      <QueryErrorState
        onRetry={() => {
          void Promise.all([
            profilesQuery.refetch(),
            balanceQuery.refetch(),
            pulseQuery.refetch(),
            pointsQuery.refetch(),
          ]);
        }}
      />
    );
  }

  const maxPoints = Math.max(...points.map((p) => p.totalPoints), 1);
  const weeklyDelta = pulse?.changeFromLastWeek ?? 0;
  const weeklyDeltaDisplay = `${weeklyDelta >= 0 ? '+' : ''}${weeklyDelta}`;

  return (
    <div className="pb-24 flex flex-col min-h-screen">
      <TopBar title={t('metrics.title')} titleIcon="monitoring" />

      <main className="flex-1 overflow-y-auto custom-scrollbar max-w-md mx-auto w-full">
        <div className="px-4 pt-2">
          <DataStatusBanner isOffline={!isOnline} isStale={isStale} isFetching={isFetching} />
        </div>

        {/* House Harmony */}
        <section className="p-4 mt-2">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-100">{t('metrics.houseHarmony')}</h3>
                <p className="text-sm text-primary/70">{t('metrics.houseHarmonySubtitle')}</p>
              </div>
              <div className="bg-primary/20 p-3 rounded-full">
                <span className="material-symbols-outlined text-primary text-3xl">favorite</span>
              </div>
            </div>

            {balance && (
              <>
                <div className="space-y-5">
                  {balance.members.map((member, index) => {
                    const highlighted = index === 0;
                    return (
                      <div key={member.id}>
                        <div className="flex justify-between items-end mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`size-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold ${highlighted ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-slate-400'}`}>
                              {member.avatarUrl ? (
                                <img src={member.avatarUrl} alt={member.name} className="size-full object-cover" />
                              ) : (
                                member.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="text-sm font-medium">{t('metrics.tasksOf', { name: member.name })}</span>
                          </div>
                          <span className={`text-lg font-bold ${highlighted ? 'text-primary' : 'text-slate-300'}`}>
                            {member.percentage}%
                          </span>
                        </div>
                        <div className="h-3 w-full bg-primary/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${highlighted ? 'bg-primary' : 'bg-slate-500'}`}
                            style={{ width: `${member.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                  <span className="material-symbols-outlined text-primary text-sm">info</span>
                  <p className="text-xs text-primary/80 font-medium tracking-wide">
                    {balance.members.length <= 1
                      ? t('metrics.balanceKeepGoing')
                      : Math.abs((balance.members[0]?.percentage ?? 0) - (balance.members[1]?.percentage ?? 0)) <= 10
                      ? t('metrics.balanceGood')
                      : t('metrics.balanceKeepGoing')}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Weekly Pulse */}
        <section className="px-4 py-2 mt-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 ml-1">{t('metrics.weeklyPulse')}</h4>
          <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">{t('metrics.weeklyTasksCompleted')}</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-100">{pulse?.completedThisWeek ?? 0}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                weeklyDelta >= 0
                  ? 'bg-primary/20 text-primary'
                  : 'bg-red-500/20 text-red-500'
              }`}>
                {t('metrics.thisWeekDelta', { delta: weeklyDeltaDisplay })}
              </span>
            </div>
          </div>
        </section>

        {/* Points Breakdown */}
        <section className="px-4 mt-6">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 ml-1">{t('metrics.pointsReceived')}</h4>
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
                        <span className="text-sm font-medium">{p.name}</span>
                      </div>
                      <span className={`text-sm font-bold ${isFirst ? 'text-primary' : 'text-slate-400'}`}>{t('metrics.pointsShort', { value: p.totalPoints })}</span>
                    </div>
                    <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full ${isFirst ? 'bg-primary shadow-[0_0_8px_rgba(23,207,145,0.4)]' : 'bg-primary opacity-80'}`}
                        style={{ width: `${taskPercent * barWidth / 100}%` }}
                      ></div>
                      <div
                        className={`h-full ${isFirst ? 'bg-teal-300/60' : 'bg-teal-300/40'}`}
                        style={{ width: `${kudosPercent * barWidth / 100}%` }}
                      ></div>
                    </div>
                    <p className={`text-[10px] mt-1.5 font-medium ${isFirst ? 'text-primary/60' : 'text-slate-500'}`}>
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
              <p className="text-sm text-slate-300 mb-4">{t('metrics.sendThanksDescription')}</p>
              <button className="bg-primary hover:bg-primary/90 text-background-dark font-bold py-2 px-6 rounded-lg text-sm transition-colors">
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
