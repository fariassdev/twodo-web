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

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (percentage / 100) * circumference;

  // Map statusColor to actual Tailwind text classes to ensure they are picked up
  const statusIconColor = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  }[statusColor];

  return (
    <Card
      className="mb-6 mt-2 border-primary/10 shadow-card-sm overflow-hidden"
      interactive
      onClick={() => navigate({ to: '/metrics' })}
      padding="md"
      radius="2xl"
      variant="elevated"
    >
      <div className="flex items-center gap-5">
        <div className="relative w-[64px] h-[64px] flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              className="text-surface-2/5 stroke-current"
              strokeWidth="5"
              cx="32"
              cy="32"
              r="28"
              fill="transparent"
            />
            <motion.circle
              className={colorClass}
              strokeWidth="6"
              strokeLinecap="round"
              cx="32"
              cy="32"
              r="28"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashoffset }}
              transition={{ duration: 1.5, ease: "circOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-[22px] font-black tracking-tighter leading-none ${statusIconColor}`}>
              {percentage}<span className="text-[11px] font-bold opacity-60 ml-0.5">%</span>
            </span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className={`w-3.5 h-3.5 ${statusIconColor}`} strokeWidth={3} />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-surface-2/40">
              {t('dashboard.balanceBadge')}
            </span>
          </div>
          <p className="text-[15px] font-bold text-surface-2 leading-tight pr-1">
            {secondaryText}
          </p>
        </div>

        <div className="flex-shrink-0 text-surface-2/15">
          <ChevronRight className="w-6 h-6" strokeWidth={1.5} />
        </div>
      </div>
    </Card>
  );
}
