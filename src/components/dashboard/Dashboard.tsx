import React from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../ui/PageHeader';
import BalanceScoreWidget from './BalanceScoreWidget';
import TodayTasksWidget from './TodayTasksWidget';
import UpcomingTasksWidget from './UpcomingTasksWidget';
import FAB from '../ui/FAB';
import DataStatusBanner from '../ui/DataStatusBanner';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export default function Dashboard() {
  const { i18n, t } = useTranslation();
  const isOnline = useOnlineStatus();

  const today = new Date();
  const dateStr = today.toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="flex flex-col h-full bg-background-dark relative min-h-screen">
      {!isOnline && <DataStatusBanner isOffline={!isOnline} isStale={false} /> }

      <PageHeader 
        title={dateStr}
        subtitle={t('dashboard.today')}
      />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        <BalanceScoreWidget />
        
        <TodayTasksWidget />
        
        <UpcomingTasksWidget />
      </div>

      <FAB />
    </div>
  );
}
