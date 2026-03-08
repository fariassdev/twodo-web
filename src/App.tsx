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

  return (
    <div className="bg-background-dark text-slate-100 min-h-screen font-display flex flex-col">
      {screen === 'dashboard' && <Dashboard onNavigate={setScreen} />}
      {screen === 'calendar' && <Calendar onNavigate={setScreen} />}
      {screen === 'details' && <TaskDetails onNavigate={setScreen} />}
      {screen === 'create' && <CreateEntry onNavigate={setScreen} />}
      {screen === 'metrics' && <Metrics />}
      {screen === 'shopping' && <ShoppingList />}

      {['dashboard', 'calendar', 'metrics', 'shopping'].includes(screen) && (
        <BottomNav currentScreen={screen} onNavigate={setScreen} />
      )}
    </div>
  );
}
