import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import { useAuthScope, useProfilesQuery, useBalanceScoreQuery } from '../../lib/queryHooks';

export default function BalanceScoreWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuthScope();
  const { data: profiles = [] } = useProfilesQuery();
  
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: scoreData = {} } = useBalanceScoreQuery(startOfMonth, endOfMonth);

  const { percentage, colorClass, secondaryText } = useMemo(() => {
    if (!profile || profiles.length < 2) {
      return { percentage: 50, colorClass: 'text-emerald-400 stroke-emerald-400', secondaryText: t('dashboard.balanceScoreText') };
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
      return { percentage: 50, colorClass: 'text-emerald-400 stroke-emerald-400', secondaryText: t('dashboard.balanceScoreText') };
    }

    const pct = Math.round((myScore / total) * 100);

    if (pct >= 40 && pct <= 60) {
      return { percentage: pct, colorClass: 'text-emerald-400 stroke-emerald-400', secondaryText: t('dashboard.balanceScoreText') };
    } else if (pct < 30 || pct > 70) {
      return { percentage: pct, colorClass: 'text-rose-500 stroke-rose-500', secondaryText: t('dashboard.balanceScoreImbalance') };
    } else {
      return { percentage: pct, colorClass: 'text-amber-500 stroke-amber-500', secondaryText: t('dashboard.balanceScoreImbalance') };
    }
  }, [scoreData, profile, profiles, t]);

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card
      className="mb-8 mt-6 flex items-center gap-5"
      interactive
      onClick={() => navigate({ to: '/metrics' })}
      padding="lg"
      radius="3xl"
      variant="elevated"
    >
      <div className="relative w-[72px] h-[72px] flex-shrink-0">
        <svg className="w-[72px] h-[72px] transform -rotate-90">
          <circle
            className="text-[#2a302c] stroke-current"
            strokeWidth="6"
            cx="36"
            cy="36"
            r="30"
            fill="transparent"
          />
          <circle
            className={`${colorClass} drop-shadow-md`}
            strokeWidth="6"
            strokeLinecap="round"
            cx="36"
            cy="36"
            r="30"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl font-bold ${colorClass.split(' ')[0]}`}>{percentage}<span className="text-xs">%</span></span>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${colorClass.includes('emerald') ? 'bg-emerald-400' : colorClass.includes('rose') ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
          <Badge className="bg-transparent p-0 text-[10px] text-gray-400" size="xs" tone="neutral">
            {t('dashboard.balanceBadge')}
          </Badge>
        </div>
        <p className="text-[15px] font-medium text-white leading-tight pr-4">
          {secondaryText || t('dashboard.balanceScoreText')}
        </p>
      </div>
    </Card>
  );
}
