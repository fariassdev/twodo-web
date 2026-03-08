import React from 'react';

interface BottomNavProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export default function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-background-dark/90 backdrop-blur-xl border-t border-primary/10 pb-6 pt-3 px-6">
      <div className="max-w-md mx-auto flex justify-between items-center">
        <button onClick={() => onNavigate('dashboard')} className={`flex flex-col items-center gap-1 ${currentScreen === 'dashboard' ? 'text-primary' : 'text-slate-400'}`}>
          <span className={`material-symbols-outlined ${currentScreen === 'dashboard' ? 'filled-icon' : ''}`}>home</span>
          <span className="text-[10px] font-bold">Inicio</span>
        </button>
        <button onClick={() => onNavigate('calendar')} className={`flex flex-col items-center gap-1 ${currentScreen === 'calendar' ? 'text-primary' : 'text-slate-400'}`}>
          <span className={`material-symbols-outlined ${currentScreen === 'calendar' ? 'filled-icon' : ''}`}>calendar_month</span>
          <span className="text-[10px] font-bold">Eventos</span>
        </button>
        <div className="relative -top-8">
          <button onClick={() => onNavigate('create')} className="h-14 w-14 rounded-full bg-primary text-background-dark shadow-lg shadow-primary/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>
        <button onClick={() => onNavigate('shopping')} className={`flex flex-col items-center gap-1 ${currentScreen === 'shopping' ? 'text-primary' : 'text-slate-400'}`}>
          <span className={`material-symbols-outlined ${currentScreen === 'shopping' ? 'filled-icon' : ''}`}>shopping_cart</span>
          <span className="text-[10px] font-bold">Compra</span>
        </button>
        <button onClick={() => onNavigate('metrics')} className={`flex flex-col items-center gap-1 ${currentScreen === 'metrics' ? 'text-primary' : 'text-slate-400'}`}>
          <span className={`material-symbols-outlined ${currentScreen === 'metrics' ? 'filled-icon' : ''}`}>monitoring</span>
          <span className="text-[10px] font-bold">Métricas</span>
        </button>
      </div>
    </nav>
  );
}
