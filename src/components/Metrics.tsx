import React, { useState, useEffect } from 'react';
import { getEquityBalance, getWeeklyPulse, getPointsBreakdown } from '../lib/queries';
import type { EquityBalance, WeeklyPulse, PointsBreakdown } from '../lib/queries';

export default function Metrics() {
  const [balance, setBalance] = useState<EquityBalance | null>(null);
  const [pulse, setPulse] = useState<WeeklyPulse | null>(null);
  const [points, setPoints] = useState<PointsBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    try {
      const [b, p, pts] = await Promise.all([
        getEquityBalance(),
        getWeeklyPulse(),
        getPointsBreakdown(),
      ]);
      setBalance(b);
      setPulse(p);
      setPoints(pts);
    } catch (err) {
      console.error('Metrics load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const maxPoints = Math.max(...points.map((p) => p.totalPoints), 1);

  return (
    <div className="pb-24 flex flex-col min-h-screen">
      <header className="flex items-center bg-background-dark p-4 sticky top-0 z-10 border-b border-primary/10 max-w-md mx-auto w-full">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="material-symbols-outlined">menu</span>
        </div>
        <h2 className="text-slate-100 text-lg font-bold leading-tight flex-1 text-center">Our Balance</h2>
        <div className="flex size-10 items-center justify-end">
          <button className="relative flex items-center justify-center text-slate-400">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-primary"></span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar max-w-md mx-auto w-full">
        {/* House Harmony */}
        <section className="p-4 mt-2">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-100">House Harmony</h3>
                <p className="text-sm text-primary/70">Teamwork makes the dream work!</p>
              </div>
              <div className="bg-primary/20 p-3 rounded-full">
                <span className="material-symbols-outlined text-primary text-3xl">favorite</span>
              </div>
            </div>

            {balance && (
              <>
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">M</div>
                      <span className="text-sm font-medium">{balance.mainName}'s Tasks</span>
                    </div>
                    <span className="text-lg font-bold text-primary">{balance.mainPercentage}%</span>
                  </div>
                  <div className="h-3 w-full bg-primary/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${balance.mainPercentage}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-slate-400">P</div>
                      <span className="text-sm font-medium">{balance.partnerName}'s Tasks</span>
                    </div>
                    <span className="text-lg font-bold text-slate-400">{balance.partnerPercentage}%</span>
                  </div>
                  <div className="h-3 w-full bg-primary/10 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-500 rounded-full transition-all duration-500" style={{ width: `${balance.partnerPercentage}%` }}></div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                  <span className="material-symbols-outlined text-primary text-sm">info</span>
                  <p className="text-xs text-primary/80 font-medium tracking-wide">
                    {Math.abs(balance.mainPercentage - balance.partnerPercentage) <= 10
                      ? 'Almost at a perfect balance! Great job today.'
                      : 'Keep working together to balance the tasks!'}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Weekly Pulse */}
        <section className="px-4 py-2 mt-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 ml-1">Weekly Pulse</h4>
          <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Weekly Tasks Completed</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-100">{pulse?.completedThisWeek ?? 0}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                (pulse?.changeFromLastWeek ?? 0) >= 0
                  ? 'bg-primary/20 text-primary'
                  : 'bg-red-500/20 text-red-500'
              }`}>
                {(pulse?.changeFromLastWeek ?? 0) >= 0 ? '+' : ''}{pulse?.changeFromLastWeek ?? 0} This Week
              </span>
            </div>
          </div>
        </section>

        {/* Points Breakdown */}
        <section className="px-4 mt-6">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 ml-1">PUNTOS RECIBIDOS</h4>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <div className="space-y-4">
              {points.map((p, i) => {
                const taskPercent = p.totalPoints > 0 ? (p.taskPoints / p.totalPoints) * 100 : 0;
                const kudosPercent = p.totalPoints > 0 ? (p.kudosPoints / p.totalPoints) * 100 : 0;
                const barWidth = (p.totalPoints / maxPoints) * 100;
                const isFirst = i === 0;
                return (
                  <div key={p.name}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className={`text-sm font-bold ${isFirst ? 'text-primary' : 'text-slate-400'}`}>{p.totalPoints} pts</span>
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
                      {p.taskPoints} pts tareas + {p.kudosPoints} pts kudos
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
              <h5 className="font-bold text-primary mb-2">Feeling Grateful?</h5>
              <p className="text-sm text-slate-300 mb-4">Send a quick "Thank You" to your partner for helping out today.</p>
              <button className="bg-primary hover:bg-primary/90 text-background-dark font-bold py-2 px-6 rounded-lg text-sm transition-colors">
                Send Kudos
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
