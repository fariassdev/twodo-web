import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Plus, CalendarDays } from 'lucide-react';
import Button from '../../ui/Button';
import Checkmark from '../../ui/Checkmark/Checkmark';

interface EmptyTodayStateProps {
  isOnboarding?: boolean;
  onAddClick: () => void;
  onPlanClick: () => void;
  compact?: boolean;
}

export default function EmptyTodayState({ 
  isOnboarding = false, 
  onAddClick, 
  onPlanClick,
  compact = false
}: EmptyTodayStateProps) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-2 mb-2 text-center"
      >
        <div className="relative mb-4">
          <Checkmark size={48} />
          <div className="absolute inset-0 bg-primary/15 blur-2xl rounded-full -z-10"></div>
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-bold text-surface-2 leading-tight tracking-tight">
            {t('dashboard.allDoneToday')}
          </h3>
          <p className="text-sm text-surface-2/50 mt-1 font-medium max-w-[280px]">
            {t('dashboard.emptyToday.overdueSubtitle')}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="relative mb-8 flex items-center justify-center">
        <Checkmark size={120} />
        <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full -z-10 animate-pulse"></div>
      </div>

      <h3 className="text-xl font-bold text-surface-2 mb-2">
        {isOnboarding ? t('dashboard.emptyToday.onboardingTitle') : t('dashboard.emptyToday.title')}
      </h3>
      
      <p className="text-surface-2/60 text-[15px] leading-relaxed mb-8 max-w-[240px]">
        {isOnboarding ? t('dashboard.emptyToday.onboardingSubtitle') : t('dashboard.emptyToday.subtitle')}
      </p>

      <div className="flex flex-col w-full gap-3 max-w-[220px]">
        <Button 
          onClick={onAddClick} 
          fullWidth
          className="shadow-button"
          startIcon={<Plus className="w-5 h-5" />}
        >
          {isOnboarding ? t('dashboard.emptyToday.cta') : t('dashboard.emptyToday.ctaExisting')}
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={onPlanClick} 
          fullWidth
          className="bg-transparent border-transparent text-surface-2/60 hover:text-surface-2"
          startIcon={<CalendarDays className="w-5 h-5" />}
        >
          {t('dashboard.emptyToday.planAhead')}
        </Button>
      </div>
    </motion.div>
  );
}
