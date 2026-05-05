import React from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export default function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-background-dark/90 backdrop-blur-xl border-t border-primary/10 h-[66px] flex items-center px-6">
      <div className="max-w-md mx-auto grid grid-cols-5 flex-1 items-center gap-2">
        <Link to="/" className="flex flex-col items-center gap-1 text-surface-2/40 [&.active]:text-primary group">
          <span className="material-symbols-outlined group-[.active]:filled-icon">home</span>
          <span className="text-[10px] font-bold">{t('nav.home')}</span>
        </Link>
        <Link to="/calendar" className="flex flex-col items-center gap-1 text-surface-2/40 [&.active]:text-primary group">
          <span className="material-symbols-outlined group-[.active]:filled-icon">calendar_month</span>
          <span className="text-[10px] font-bold">{t('nav.calendar')}</span>
        </Link>
        <Link to="/expenses" className="flex flex-col items-center gap-1 text-surface-2/40 [&.active]:text-primary group">
          <span className="material-symbols-outlined group-[.active]:filled-icon">receipt_long</span>
          <span className="text-[10px] font-bold">{t('nav.expenses')}</span>
        </Link>
        <Link to="/shopping" className="flex flex-col items-center gap-1 text-surface-2/40 [&.active]:text-primary group">
          <span className="material-symbols-outlined group-[.active]:filled-icon">shopping_cart</span>
          <span className="text-[10px] font-bold">{t('nav.shopping')}</span>
        </Link>
        <Link to="/metrics" className="flex flex-col items-center gap-1 text-surface-2/40 [&.active]:text-primary group">
          <span className="material-symbols-outlined group-[.active]:filled-icon">monitoring</span>
          <span className="text-[10px] font-bold">{t('nav.metrics')}</span>
        </Link>
      </div>
    </nav>
  );
}
