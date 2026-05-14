import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Banknote, PiggyBank } from 'lucide-react';
import { cn } from '../../../utils';
import PageHeader from '../../ui/PageHeader';
import Button from '../../ui/Button';
import FormField from '../../ui/FormField';
import TextInput from '../../ui/TextInput';
import FullPageLoading from '../../ui/FullPageLoading';
import ErrorBanner from '../../ui/ErrorBanner';
import SettlementSuccess from './SettlementSuccess';
import { centsToCurrency } from '../../../helpers/expense';
import {
    useCreateSettlementMutation,
  useExpensesDashboardQuery,
  useProfilesQuery,
} from '../../../lib/queryHooks';
import { settlementFormSchema, type SettlementFormValues } from '../../../helpers/schemas';
import { useAuthScope } from '@/src/context/AuthContext';

const MoneyFlowParticles = ({ direction }: { direction: 'to-center' | 'from-center' }) => {
  const isToCenter = direction === 'to-center';
  
  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: isToCenter ? -90 : 30, 
            y: (Math.random() - 0.5) * 20,
            opacity: 0, 
            scale: 0.5, 
            rotate: 0 
          }}
          animate={{ 
            x: isToCenter ? -30 : 90,
            opacity: [0, 1, 1, 0], 
            scale: [0.5, 1, 1, 0.8],
            rotate: (Math.random() - 0.5) * 40
          }}
          transition={{ 
            duration: 1.5, 
            delay: i * 0.4,
            ease: "easeInOut"
          }}
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center drop-shadow-md",
            isToCenter ? "text-rose-400/70" : "text-emerald-400/70"
          )}
        >
          <Banknote className="w-5 h-5" />
        </motion.div>
      ))}
    </div>
  );
};

const PiggyBankBurst = () => {
  const particles = useMemo(() => [...Array(6)].map((_, i) => {
    const angle = (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const distance = 20 + Math.random() * 15;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      delay: Math.random() * 0.2,
      duration: 0.8 + Math.random() * 0.4,
    };
  }), []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 0.8, scale: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/40"
        />
      ))}
    </div>
  );
};

export default function SettleBalance() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profileId } = useAuthScope();

  // Animation State Machine
  const [animationPhase, setAnimationPhase] = useState<1 | 2 | 3 | 4>(1);
  const [showSuccess, setShowSuccess] = useState(false);
  
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (animationPhase === 1) timeout = setTimeout(() => setAnimationPhase(2), 3000);
    if (animationPhase === 2) timeout = setTimeout(() => setAnimationPhase(3), 1000);
    if (animationPhase === 3) timeout = setTimeout(() => setAnimationPhase(4), 3000);
    if (animationPhase === 4) timeout = setTimeout(() => setAnimationPhase(1), 1000);
    return () => clearTimeout(timeout);
  }, [animationPhase]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: { note: '' },
  });

  const dashboardQuery = useExpensesDashboardQuery();
  const profilesQuery = useProfilesQuery();
  const createSettlementMutation = useCreateSettlementMutation();

  const [actionError, setActionError] = useState<string | null>(null);

  const balance = dashboardQuery.data?.balance;
  const amountLabel = centsToCurrency(balance?.amountCents ?? 0, i18n.language);
  const counterpartyName = balance?.counterpartyProfile?.name ?? t('common.partnerFallback');

  const canSettle = balance?.direction !== 'settled' && (balance?.amountCents ?? 0) > 0;

  const handleConfirmSettlement = handleSubmit(async ({ note }) => {
    if (!canSettle) return;

    setActionError(null);
    try {
      await createSettlementMutation.mutateAsync({ note });
      setShowSuccess(true);
    } catch (error) {
      console.error('Settlement error:', error);
      setActionError(t('queryState.mutationError'));
    }
  });

  if (showSuccess) {
    return (
      <SettlementSuccess 
        onDone={() => navigate({ to: '/expenses' })} 
        userAvatar={profilesQuery.data?.find(p => p.id === profileId)?.avatar_url}
        partnerAvatar={balance?.counterpartyProfile?.avatar_url}
        partnerName={counterpartyName}
      />
    );
  }

  if (dashboardQuery.isPending || profilesQuery.isPending) {
    return <FullPageLoading message={t('loading')} />;
  }

  if (!balance || balance.direction === 'settled') {
    return (
       <div className="flex flex-col h-dvh bg-background-light dark:bg-background-dark overflow-hidden">
        <PageHeader
          title={t('expenses.settlement.title')}
          showAvatars={false}
          backAction={{
            onClick: () => navigate({ to: '/expenses' }),
          }}
        />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
           <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center text-success mb-6">
              <span className="material-symbols-outlined !text-[40px] filled-icon">verified</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-surface-2 mb-2">
              {t('expenses.balance.settled')}
            </h2>
            <p className="text-surface-2/60">
              {t('expenses.balance.settledSubtitle')}
            </p>
            <Button 
              className="mt-8 px-8" 
              variant="primary" 
              onClick={() => navigate({ to: '/expenses' })}
            >
              {t('cta.backToDashboard')}
            </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-background-light dark:bg-background-dark overflow-hidden">
      <PageHeader
        title={t('expenses.settlement.title')}
        showAvatars={false}
        backAction={{
          onClick: () => navigate({ to: '/expenses' }),
        }}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <main className="max-w-md mx-auto w-full px-6 pt-10">
          {actionError && <ErrorBanner className="mb-6" message={actionError} />}

          <div className="text-center mb-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-8">
              {t('expenses.settlement.amountToSettle')}
            </h2>

            <div className="relative mb-12">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-primary/5 blur-3xl z-0" />
              
              <div className="relative z-10 flex flex-col items-center justify-center">
                <div className="flex items-start leading-none gap-[0.5rem]">
                  <span className="font-display text-[clamp(3rem,15vw,5rem)] font-normal tracking-[-0.02em] leading-[0.9] tabular-nums text-surface-2 italic">
                    {amountLabel.replace(/[^\d.,]/g, '')}
                  </span>
                  <span className="font-sans text-[clamp(1.2rem,6vw,2.2rem)] font-light text-surface-2/20 pt-[0.4rem]">
                    €
                  </span>
                </div>
                <FormField
                  className="w-full"
                  error={errors.note && t(errors.note.message!)}
                  errorClassName="mt-2 text-[10px] font-bold text-danger uppercase tracking-wider text-center animate-in fade-in slide-in-from-top-1 duration-300"
                >
                  <TextInput
                    maxLength={200}
                    placeholder={t('expenses.settlement.notePlaceholder')}
                    type="text"
                    variant="editorial"
                    {...register('note')}
                  />
                </FormField>
              </div>
            </div>

            <div className="flex items-start justify-between gap-2 mb-12 max-w-sm mx-auto">
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex flex-col items-center gap-3 w-20 relative"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 bg-primary/5 flex items-center justify-center shadow-lg relative z-10">
                  {balance?.direction === 'you_owe' ? (
                    profileId && profilesQuery.data?.find(p => p.id === profileId)?.avatar_url ? (
                      <img src={profilesQuery.data.find(p => p.id === profileId)!.avatar_url!} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-primary">Me</span>
                    )
                  ) : (
                    balance?.counterpartyProfile?.avatar_url ? (
                      <img src={balance.counterpartyProfile.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-primary">{counterpartyName[0]}</span>
                    )
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-surface-2/40">
                  {balance?.direction === 'you_owe' ? t('common.me') : counterpartyName}
                </span>
              </motion.div>

              <div className="flex-1 flex flex-col items-center justify-center min-w-[140px] h-16 relative">
                {/* Flow Particles */}
                {animationPhase === 1 && <MoneyFlowParticles direction="to-center" />}
                {animationPhase === 3 && <MoneyFlowParticles direction="from-center" />}

                {/* Animated PiggyBank Center */}
                <motion.div 
                  initial={{ scale: 1 }}
                  animate={{ 
                    scale: animationPhase === 1 || animationPhase === 2 ? 1.2 : 1
                  }}
                  transition={{
                    duration: animationPhase === 1 || animationPhase === 3 ? 3 : 0.3,
                    ease: "easeInOut"
                  }}
                  className="relative z-10 w-14 h-14 rounded-full bg-background-light flex items-center justify-center text-primary/60 shadow-glow-primary/10 ring-1 ring-primary/15"
                >
                  <PiggyBank className="w-7 h-7" />

                  {animationPhase === 2 && <PiggyBankBurst />}

                  {/* Outer pulse effect */}
                  <motion.div
                    initial={{ scale: 1, opacity: 0.3 }}
                    animate={{ 
                      scale: animationPhase === 2 ? 1.4 : 1, 
                      opacity: animationPhase === 2 ? 0 : 0.2
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border border-primary/20"
                  />
                </motion.div>
              </div>

              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex flex-col items-center gap-3 w-20 relative"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/40 bg-primary/10 flex items-center justify-center shadow-glow-primary/10 ring-2 ring-primary/20 relative z-10">
                   {balance?.direction === 'you_are_owed' ? (
                    profileId && profilesQuery.data?.find(p => p.id === profileId)?.avatar_url ? (
                      <img src={profilesQuery.data.find(p => p.id === profileId)!.avatar_url!} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-primary">Me</span>
                    )
                  ) : (
                    balance?.counterpartyProfile?.avatar_url ? (
                      <img src={balance.counterpartyProfile.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-primary">{counterpartyName[0]}</span>
                    )
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-surface-2/40">
                  {balance?.direction === 'you_are_owed' ? t('common.me') : counterpartyName}
                </span>
              </motion.div>
            </div>

            <p className="text-base font-medium text-surface-2/60 px-8 leading-relaxed">
              {balance?.direction === 'you_are_owed'
                ? t('expenses.settlement.confirmReceipt', { amount: amountLabel, name: counterpartyName })
                : t('expenses.settlement.confirmTransfer', { amount: amountLabel, name: counterpartyName })}
            </p>
          </div>
        </main>
      </div>

      <div className="shrink-0 p-4 pb-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-border-subtle shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        <div className="max-w-md mx-auto w-full">
          <Button
            className="h-16 shadow-glow-primary text-lg rounded-2xl font-bold"
            disabled={!canSettle || createSettlementMutation.isPending}
            loading={createSettlementMutation.isPending}
            onClick={handleConfirmSettlement}
            fullWidth
            variant="primary"
          >
            {createSettlementMutation.isPending ? t('common.saving') : t('expenses.settlement.confirmButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}
