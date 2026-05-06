import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import Badge from '../../ui/Badge';
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

  const { percentage, colorClass, secondaryText } = useMemo(() => {
    if (!profile || profiles.length < 2) {
      return { percentage: 50, colorClass: 'text-primary stroke-primary', secondaryText: t('dashboard.balanceScoreText') };
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
      return { percentage: 50, colorClass: 'text-primary stroke-primary', secondaryText: t('dashboard.balanceScoreText') };
    }

    const pct = Math.round((myScore / total) * 100);

    if (pct >= 42 && pct <= 58) {
      return { 
        percentage: pct, 
        colorClass: 'text-success stroke-success', 
        secondaryText: t('dashboard.balanceScoreText') 
      };
    } else if (pct >= 30 && pct <= 70) {
      return { 
        percentage: pct, 
        colorClass: 'text-warning stroke-warning', 
        secondaryText: t('dashboard.balanceScoreImbalance') 
      };
    } else {
      return { 
        percentage: pct, 
        colorClass: 'text-danger stroke-danger', 
        secondaryText: t('dashboard.balanceScoreImbalance') 
      };
    }
  }, [scoreData, profile, profiles, t]);

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card
      className="mb-8 mt-6 flex items-center gap-5 shadow-glow-primary bg-linear-to-br from-surface-1 to-surface-1/20 border-2 border-primary"
      interactive
      onClick={() => navigate({ to: '/metrics' })}
      padding="lg"
      radius="3xl"
      variant="surface"
    >
      <div className="relative w-[72px] h-[72px] flex-shrink-0">
        <svg className="w-[72px] h-[72px] transform -rotate-90">
          <circle
            className="text-surface-2/10 stroke-current"
            strokeWidth="6"
            cx="36"
            cy="36"
            r="30"
            fill="transparent"
          />
          <circle
            className={`${colorClass}`}
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
          <span className={`text-2xl font-black ${colorClass.split(' ')[0]}`}>{percentage}<span className="text-xs">%</span></span>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${colorClass.includes('success') ? 'bg-success' : colorClass.includes('danger') ? 'bg-danger' : colorClass.includes('warning') ? 'bg-warning' : 'bg-primary'}`}></div>
          <Badge className="bg-transparent p-0 font-bold uppercase tracking-wider text-surface-2/60" size="xs" tone="neutral">
            {t('dashboard.balanceBadge')}
          </Badge>
        </div>
        <p className="text-lg font-bold text-surface-2 leading-tight pr-4">
          {secondaryText || t('dashboard.balanceScoreText')}
        </p>
      </div>
      <div className="ml-auto text-primary/40">
        <ChevronRight className="w-5 h-5" />
      </div>
    </Card>
  );
}
