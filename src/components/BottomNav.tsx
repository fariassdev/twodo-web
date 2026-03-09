import React from 'react';
import { Link } from '@tanstack/react-router';

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-background-dark/90 backdrop-blur-xl border-t border-primary/10 pb-6 pt-3 px-6">
      <div className="max-w-md mx-auto flex justify-between items-center">
        <Link to="/" className="flex flex-col items-center gap-1 text-slate-400 [&.active]:text-primary group">
          <span className="material-symbols-outlined group-[.active]:filled-icon">home</span>
          <span className="text-[10px] font-bold">Inicio</span>
        </Link>
        <Link to="/calendar" className="flex flex-col items-center gap-1 text-slate-400 [&.active]:text-primary group">
          <span className="material-symbols-outlined group-[.active]:filled-icon">calendar_month</span>
          <span className="text-[10px] font-bold">Eventos</span>
        </Link>
        <div className="relative -top-8">
          <Link to="/create" className="h-14 w-14 rounded-full bg-primary text-background-dark shadow-lg shadow-primary/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">add</span>
          </Link>
        </div>
        <Link to="/shopping" className="flex flex-col items-center gap-1 text-slate-400 [&.active]:text-primary group">
          <span className="material-symbols-outlined group-[.active]:filled-icon">shopping_cart</span>
          <span className="text-[10px] font-bold">Compra</span>
        </Link>
        <Link to="/metrics" className="flex flex-col items-center gap-1 text-slate-400 [&.active]:text-primary group">
          <span className="material-symbols-outlined group-[.active]:filled-icon">monitoring</span>
          <span className="text-[10px] font-bold">Métricas</span>
        </Link>
      </div>
    </nav>
  );
}
