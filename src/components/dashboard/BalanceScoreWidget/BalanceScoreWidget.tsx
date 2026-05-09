import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { ChevronRight, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import Card from '../../ui/Card';
import { useAuthScope, useProfilesQuery, useBalanceScoreQuery } from '../../../lib/queryHooks';

export default function BalanceScoreWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuthScope();
  const { data: profiles = [] } = useProfilesQuery();
  
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: scoreData = {} } = useBalanceScoreQuery(startOfMonth, endOfMonth);

  const { percentage, colorClass, statusColor, secondaryText } = useMemo(() => {
    const defaultTheme = {
      colorClass: 'text-primary stroke-primary',
      statusColor: 'primary',
    };

    if (!profile || profiles.length < 2) {
      return { 
        percentage: 50, 
        ...defaultTheme,
        secondaryText: t('dashboard.balanceScoreEmpty')
      };
    }

    let total = 0;
    let myScore = 0;

    Object.entries(scoreData).forEach(([pid, score]) => {
      total += score;
      if (pid === profile.id) {
        myScore += score;
      }
    });

    if (total === 0) {
      return { 
        percentage: 0, 
        ...defaultTheme,
        secondaryText: t('dashboard.balanceScoreEmpty')
      };
    }

    const pct = Math.round((myScore / total) * 100);

    if (pct >= 42 && pct <= 58) {
      return { 
        percentage: pct, 
        colorClass: 'text-success stroke-success', 
        statusColor: 'success',
        secondaryText: t('dashboard.balanceScoreSuccess') 
      };
    } else if (pct >= 30 && pct <= 70) {
      return { 
        percentage: pct, 
        colorClass: 'text-warning stroke-warning', 
        statusColor: 'warning',
        secondaryText: t('dashboard.balanceScoreWarning') 
      };
    } else {
      return { 
        percentage: pct, 
        colorClass: 'text-danger stroke-danger', 
        statusColor: 'danger',
        secondaryText: t('dashboard.balanceScoreDanger') 
      };
    }
  }, [scoreData, profile, profiles, t]);

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (percentage / 100) * circumference;

  // Map statusColor to explicit Tailwind classes for both text and background
  const theme = {
    primary: { text: 'text-primary', bg: 'bg-primary', stroke: 'text-primary stroke-primary' },
    success: { text: 'text-success', bg: 'bg-success', stroke: 'text-success stroke-success' },
    warning: { text: 'text-warning', bg: 'bg-warning', stroke: 'text-warning stroke-warning' },
    danger: { text: 'text-danger', bg: 'bg-danger', stroke: 'text-danger stroke-danger' },
  }[statusColor] ?? { text: 'text-primary', bg: 'bg-primary', stroke: 'text-primary stroke-primary' };

  return (
    <Card
      className="mb-8 mt-2 border-primary/10 shadow-card-md overflow-hidden"
      interactive
      onClick={() => navigate({ to: '/metrics' })}
      padding="none"
      radius="2xl"
      variant="elevated"
    >
      <div className="flex flex-col sm:flex-row items-stretch">
        {/* Metric Area: More visual weight on larger screens */}
        <div className="bg-surface-2/[0.02] sm:bg-surface-2/[0.03] p-6 pb-3 sm:p-8 flex items-center justify-center sm:border-r border-primary/5">
          <div className="relative w-[88px] h-[88px] sm:w-[110px] sm:h-[110px] flex-shrink-0 flex items-center justify-center">
            {/* Subtle glow background */}
            <div className={`absolute inset-0 rounded-full blur-xl opacity-20 ${theme.bg}`} />
            
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 relative z-10">
              <circle
                className="text-surface-2/5 stroke-current"
                strokeWidth="8"
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
              />
              <motion.circle
                className={theme.stroke}
                strokeWidth="10"
                strokeLinecap="round"
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashoffset }}
                transition={{ duration: 1.5, ease: "circOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <span className={`text-[24px] sm:text-[28px] font-black tracking-tighter leading-none ${theme.text}`}>
                {percentage}<span className="text-[12px] sm:text-[14px] font-bold opacity-60 ml-0.5">%</span>
              </span>
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-6 pt-3 sm:p-8 flex flex-col justify-center text-center sm:text-left min-w-0 relative">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
            <Activity className={`w-3.5 h-3.5 ${theme.text}`} strokeWidth={3} />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-surface-2/40">
              {t('dashboard.balanceBadge')}
            </span>
          </div>
          <p className="text-[15px] sm:text-[17px] font-bold text-surface-2 leading-tight max-w-md mx-auto sm:mx-0 px-2 sm:px-0">
            {secondaryText}
          </p>
          
          <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:block text-surface-2/10">
            <ChevronRight className="w-8 h-8" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </Card>
  );
}
