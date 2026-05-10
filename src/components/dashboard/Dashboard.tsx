import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import BalanceScoreWidget from '../ui/BalanceScoreWidget';
import TodayTasksWidget from './TodayTasksWidget';
import UpcomingTasksWidget from './UpcomingTasksWidget';
import Button from '../ui/Button';
import DataStatusBanner from '../ui/DataStatusBanner';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useTodaysTasksQuery, useOverdueTasksQuery } from '../../lib/queryHooks';

export default function Dashboard() {
  const { i18n, t } = useTranslation();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  const todaysTasksQuery = useTodaysTasksQuery();
  const overdueTasksQuery = useOverdueTasksQuery();

  const tasks = todaysTasksQuery.data ?? [];
  const overdueTasks = overdueTasksQuery.data ?? [];
  const hasTasksToday = tasks.length > 0 || overdueTasks.length > 0;

  const today = new Date();
  const dateStr = today.toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="flex flex-col bg-background-dark relative">
      {!isOnline && <DataStatusBanner isOffline={!isOnline} isStale={false} /> }

      <PageHeader 
        title={dateStr}
        subtitle={t('common.today')}
      />

      <main className="max-w-md mx-auto w-full px-4 pt-4 pb-20">
        <BalanceScoreWidget compact />
        
        <TodayTasksWidget />
        
        <UpcomingTasksWidget />
      </main>

      {hasTasksToday && (
        <Button
          variant="action"
          size="icon"
          className="fixed bottom-24 right-6 z-fab"
          onClick={() => navigate({ to: '/create' })}
          aria-label={t('common.createEntry') || 'Create Entry'}
        >
          <Plus className="w-8 h-8 stroke-[2.5]" />
        </Button>
      )}
    </div>
  );
}
