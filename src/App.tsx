import React, { useState } from 'react';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import TaskDetails from './components/TaskDetails';
import CreateEntry from './components/CreateEntry';
import Metrics from './components/Metrics';
import ShoppingList from './components/ShoppingList';

type Screen = 'dashboard' | 'calendar' | 'details' | 'create' | 'metrics' | 'shopping';

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  // A counter to force refetch when data changes
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = (s: string, taskId?: string) => {
    if (taskId) setSelectedTaskId(taskId);
    setScreen(s as Screen);
  };

  const navigateWithRefresh = (s: string) => {
    setRefreshKey((k) => k + 1);
    setScreen(s as Screen);
  };

  return (
    <div className="bg-background-dark text-slate-100 min-h-screen font-display flex flex-col">
      {screen === 'dashboard' && <Dashboard key={refreshKey} onNavigate={navigate} />}
      {screen === 'calendar' && <Calendar key={refreshKey} onNavigate={navigate} />}
      {screen === 'details' && <TaskDetails taskId={selectedTaskId} onNavigate={navigate} onDataChange={navigateWithRefresh} />}
      {screen === 'create' && <CreateEntry onNavigate={navigate} onCreated={() => navigateWithRefresh('dashboard')} />}
      {screen === 'metrics' && <Metrics key={refreshKey} />}
      {screen === 'shopping' && <ShoppingList key={refreshKey} />}

      {['dashboard', 'calendar', 'metrics', 'shopping'].includes(screen) && (
        <BottomNav currentScreen={screen} onNavigate={navigate} />
      )}
    </div>
  );
}
