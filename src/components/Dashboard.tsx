import React from 'react';
import { useTranslation } from 'react-i18next';
import CompactHeader from './dashboard/CompactHeader';
import BalanceScoreWidget from './dashboard/BalanceScoreWidget';
import TodayTasksWidget from './dashboard/TodayTasksWidget';
import UpcomingTasksWidget from './dashboard/UpcomingTasksWidget';
import FAB from './ui/FAB';
import DataStatusBanner from './ui/DataStatusBanner';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function Dashboard() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  return (
    <div className="flex flex-col h-full bg-[#131815] relative min-h-screen">
      {!isOnline && <DataStatusBanner isOffline={!isOnline} isStale={false} /> }

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-20">
        <CompactHeader />
        
        <BalanceScoreWidget />
        
        <TodayTasksWidget />
        
        <UpcomingTasksWidget />
      </div>

      <FAB />
    </div>
  );
}
