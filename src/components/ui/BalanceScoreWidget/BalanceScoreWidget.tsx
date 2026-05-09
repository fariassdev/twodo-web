import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'motion/react';
import { startOfWeek, subDays, startOfYear, endOfDay } from 'date-fns';
import { useAuthScope, useProfilesQuery, useBalanceScoreQuery } from '../../../lib/queryHooks';
import { cn } from '../../../utils';

interface BalanceScoreWidgetProps {
  compact?: boolean;
}

type TimeFilter = 'thisWeek' | 'last30Days' | 'thisYear';

export default function BalanceScoreWidget({ compact = false }: BalanceScoreWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuthScope();
  const profilesQuery = useProfilesQuery();
  const profiles = profilesQuery.data ?? [];
  
  const [filter, setFilter] = useState<TimeFilter>('thisWeek');

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    const end: Date = endOfDay(now);
    
    if (filter === 'thisWeek') {
      start = startOfWeek(now, { weekStartsOn: 1 });
    } else if (filter === 'last30Days') {
      start = subDays(now, 30);
    } else if (filter === 'thisYear') {
      start = startOfYear(now);
    }
    
    return { 
      startDate: start ? start.toISOString() : '', 
      endDate: end.toISOString() 
    };
  }, [filter]);

  const { data: balanceData, isPending, isFetching } = useBalanceScoreQuery(startDate, endDate);
  
  const scoreData = balanceData?.score || {};
  const completedTasks = balanceData?.taskCount || 0;

  const memberA = profiles[0] || null;
  const memberB = profiles[1] || null;

  const ptsA = memberA ? (scoreData[memberA.id] || 0) : 0;
  const ptsB = memberB ? (scoreData[memberB.id] || 0) : 0;
  const total = ptsA + ptsB;

  const pctA = total > 0 ? Math.round((ptsA / total) * 100) : 50;
  const finalPct = (!memberA || !memberB || total === 0) ? 50 : pctA;

  const { colorTheme, copyText, trend, attributionText } = useMemo(() => {
    if (!profile || profiles.length < 2 || total === 0) {
      return { 
        colorTheme: 'primary',
        copyText: t('dashboard.balance.empty'),
        trend: 'flat',
        attributionText: t('dashboard.balance.noData')
      };
    }

    let trendValue: 'up' | 'down' | 'flat' = 'flat';
    let attrText = t('dashboard.balance.veryBalanced');

    if (finalPct >= 42 && finalPct <= 58) {
      return { 
        colorTheme: 'success',
        copyText: t('dashboard.balance.success'),
        trend: 'flat',
        attributionText: t('dashboard.balance.veryBalanced')
      };
    } else if (finalPct >= 30 && finalPct <= 70) {
      if (finalPct > 58) {
        attrText = t('dashboard.balance.bitMoreLoad', { name: memberA.name });
        trendValue = 'up';
      } else {
        attrText = t('dashboard.balance.bitMoreLoad', { name: memberB.name });
        trendValue = 'down';
      }
      return { 
        colorTheme: 'warning',
        copyText: t('dashboard.balance.warning'),
        trend: trendValue,
        attributionText: attrText
      };
    } else {
      if (finalPct > 70) {
        attrText = t('dashboard.balance.muchMoreLoad', { name: memberA.name });
        trendValue = 'up';
      } else {
        attrText = t('dashboard.balance.muchMoreLoad', { name: memberB.name });
        trendValue = 'down';
      }
      return { 
        colorTheme: 'danger',
        copyText: t('dashboard.balance.danger'),
        trend: trendValue,
        attributionText: attrText
      };
    }
  }, [finalPct, profile, profiles, total, t, memberA, memberB]);

  const themeClasses = {
    primary: { text: 'text-primary', bg: 'bg-primary', lightBg: 'bg-primary/20', fill: 'bg-primary', border: 'border-primary' },
    success: { text: 'text-success', bg: 'bg-success', lightBg: 'bg-success/20', fill: 'bg-success', border: 'border-success' },
    warning: { text: 'text-warning', bg: 'bg-warning', lightBg: 'bg-warning/20', fill: 'bg-warning', border: 'border-warning' },
    danger: { text: 'text-danger', bg: 'bg-danger', lightBg: 'bg-danger/20', fill: 'bg-danger', border: 'border-danger' },
  }[colorTheme] ?? { text: 'text-primary', bg: 'bg-primary', lightBg: 'bg-primary/20', fill: 'bg-primary', border: 'border-primary' };

  const isLoading = isPending || profilesQuery.isPending;

  // Map theme to CSS variables for motion animation
  const themeColorVar = `var(--color-${colorTheme})`;
  const skeletonColor = 'rgba(73, 52, 33, 0.1)';

  return (
    <article 
      className={cn(
        "w-full bg-surface-1 rounded-[1.5rem] shadow-card-md overflow-hidden transition-all duration-300",
        compact && "mb-8 mt-2 cursor-pointer active:scale-[0.98]",
        isFetching && !isPending && "opacity-80"
      )}
      onClick={() => { if(compact) navigate({ to: '/metrics' }) }}
      aria-label={t('dashboard.balance.title')}
    >
      <div className="p-6 flex flex-col gap-4">
        
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.09em] text-surface-2/60">
            <motion.div 
              animate={{ backgroundColor: isLoading ? skeletonColor : themeColorVar }}
              className={cn("w-[7px] h-[7px] rounded-full shrink-0 transition-colors", isLoading && "animate-pulse")}
            ></motion.div>
            {t('dashboard.balance.title')}
          </div>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as TimeFilter)}
              onClick={(e) => e.stopPropagation()}
              className="appearance-none text-xs font-medium text-surface-2/60 bg-border-subtle border border-border-strong rounded-full py-1 pl-3 pr-7 cursor-pointer hover:bg-border-strong transition-colors outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
            >
              <option value="thisWeek">{t('dashboard.balance.filters.thisWeek')}</option>
              <option value="last30Days">{t('dashboard.balance.filters.last30Days')}</option>
              <option value="thisYear">{t('dashboard.balance.filters.thisYear')}</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-surface-2/40">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </header>


        {/* Hero number */}
        <div className="flex flex-col items-center gap-3 text-center min-h-[8rem] justify-center">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="skeleton-number"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-32 h-20 bg-surface-2/5 animate-pulse rounded-2xl"
              />
            ) : (
              <motion.div 
                key={`${filter}-${finalPct}`}
                initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="flex items-start leading-none gap-[0.05em]"
              >
                <span className={cn(
                  "font-display text-[clamp(5rem,22vw,7.5rem)] font-normal tracking-[-0.02em] leading-[0.9] tabular-nums transition-colors italic",
                  themeClasses.text
                )}>
                  {finalPct}
                </span>
                <span className="font-sans text-[clamp(1.5rem,6vw,2.5rem)] font-light text-surface-2/40 pt-[0.3em] transition-colors">
                  %
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Attribution */}
        {!compact && (
          <div className="h-6 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div 
                  key="skeleton-attr"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-48 h-4 bg-surface-2/5 animate-pulse rounded-full"
                />
              ) : profiles.length >= 2 && total > 0 && (
                <motion.div 
                  key={`${filter}-attr`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-center gap-2 text-sm text-surface-2/60"
                >
                  <span>{attributionText}</span>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-xs font-semibold py-[3px] px-2 rounded-full tabular-nums transition-colors",
                    trend === 'up' ? 'bg-success/20 text-success' :
                    trend === 'down' ? 'bg-danger/20 text-danger' :
                    'bg-border-strong text-surface-2/60'
                  )}>
                    {trend === 'up' ? `↑ ${Math.abs(finalPct - 50)}pts` : 
                     trend === 'down' ? `↓ ${Math.abs(finalPct - 50)}pts` : 
                     `→ ${t('dashboard.balance.stable')}`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Bar section */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center h-10">
            {isLoading ? (
              <>
                <div className="w-24 h-8 bg-surface-2/5 animate-pulse rounded-full" />
                <div className="w-24 h-8 bg-surface-2/5 animate-pulse rounded-full" />
              </>
            ) : profiles.length >= 2 && (
              <>
                {/* Member A (Left) */}
                <motion.div 
                  layout
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-border-strong flex items-center justify-center text-[15px] border-2 border-surface-1 shrink-0 overflow-hidden text-surface-2 font-bold shadow-sm">
                    {memberA?.avatar_url ? (
                      <img src={memberA.avatar_url} alt={memberA.name} className="w-full h-full object-cover" />
                    ) : (
                      memberA?.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-surface-2 leading-tight">{memberA?.name}</span>
                    <motion.span 
                      key={`${filter}-${ptsA}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-surface-2/60 tabular-nums"
                    >
                      {ptsA} pts
                    </motion.span>
                  </div>
                </motion.div>

                {/* Member B (Right) */}
                <motion.div 
                  layout
                  className="flex items-center gap-2 flex-row-reverse text-right"
                >
                  <div className="w-8 h-8 rounded-full bg-border-strong flex items-center justify-center text-[15px] border-2 border-surface-1 shrink-0 overflow-hidden text-surface-2 font-bold shadow-sm">
                    {memberB?.avatar_url ? (
                      <img src={memberB.avatar_url} alt={memberB.name} className="w-full h-full object-cover" />
                    ) : (
                      memberB?.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-surface-2 leading-tight">{memberB?.name}</span>
                    <motion.span 
                      key={`${filter}-${ptsB}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-surface-2/60 tabular-nums"
                    >
                      {ptsB} pts
                    </motion.span>
                  </div>
                </motion.div>
              </>
            )}
          </div>

          <div className="relative pt-1">
            <div className="w-full h-2.5 bg-surface-2/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full rounded-full origin-left"
                initial={{ width: '50%' }}
                animate={{ 
                  width: isLoading ? '50%' : `${finalPct}%`,
                  backgroundColor: isLoading ? skeletonColor : themeColorVar
                }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              ></motion.div>
            </div>
            {!isLoading && (
              <>
                <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-[2px] h-[18px] bg-surface-2/20 rounded-full pointer-events-none"></div>
                <div className="absolute top-[18px] left-1/2 -translate-x-1/2 text-[10px] text-surface-2/40 font-bold tracking-[0.06em] whitespace-nowrap pointer-events-none uppercase">
                  50%
                </div>
              </>
            )}
          </div>
        </div>

        <div className="min-h-[3rem] flex items-center justify-center pt-2">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="skeleton-copy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-[80%] h-4 bg-surface-2/5 animate-pulse rounded-full"
              />
            ) : (
              <motion.p 
                key={`${filter}-copy`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-center text-sm text-surface-2/60 leading-relaxed max-w-[85%] mx-auto"
              >
                {copyText}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!compact && (
          <motion.div 
            layout
            className="flex flex-col gap-0"
          >
            <div className="h-[1px] bg-border-subtle mx-[-1.5rem] my-2"></div>
            <footer className="grid grid-cols-[1fr_1px_1fr] gap-0 h-12">
              <div className="flex flex-col items-center justify-center gap-0.5">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div key="sk-tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-8 h-5 bg-surface-2/5 animate-pulse rounded" />
                  ) : (
                    <motion.span key={completedTasks} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-lg font-bold text-surface-2 tabular-nums">{completedTasks}</motion.span>
                  )}
                </AnimatePresence>
                <span className="text-[10px] font-bold uppercase tracking-wider text-surface-2/40">{t('dashboard.balance.completedTasks')}</span>
              </div>
              <div className="bg-border-subtle h-8 self-center"></div>
              <div className="flex flex-col items-center justify-center gap-0.5">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div key="sk-total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-8 h-5 bg-surface-2/5 animate-pulse rounded" />
                  ) : (
                    <motion.span key={total} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-lg font-bold text-surface-2 tabular-nums">{total}</motion.span>
                  )}
                </AnimatePresence>
                <span className="text-[10px] font-bold uppercase tracking-wider text-surface-2/40">{t('dashboard.balance.totalPoints')}</span>
              </div>
            </footer>
          </motion.div>
        )}
      </div>
    </article>
  );
}

