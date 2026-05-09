import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import PageHeader from '../../ui/PageHeader';
import Button from '../../ui/Button';
import FormField from '../../ui/FormField';
import TextInput from '../../ui/TextInput';
import FullPageLoading from '../../ui/FullPageLoading';
import ErrorBanner from '../../ui/ErrorBanner';
import { centsToCurrency } from '../../../helpers/expense';
import {
  useAuthScope,
  useCreateSettlementMutation,
  useExpensesDashboardQuery,
  useProfilesQuery,
} from '../../../lib/queryHooks';
import { settlementFormSchema, type SettlementFormValues } from '../../../helpers/schemas';

export default function SettleBalance() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profileId } = useAuthScope();

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
  const counterpartyName = balance?.counterpartyProfile?.name ?? t('expenses.partnerFallback');

  const canSettle = balance?.direction !== 'settled' && (balance?.amountCents ?? 0) > 0;

  const handleConfirmSettlement = handleSubmit(async ({ note }) => {
    if (!canSettle) return;

    setActionError(null);
    try {
      await createSettlementMutation.mutateAsync({ note });
      navigate({ to: '/expenses' });
    } catch (error) {
      console.error('Settlement error:', error);
      setActionError(t('queryState.mutationError'));
    }
  });

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

            <div className="flex items-center justify-center gap-8 mb-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 bg-primary/5 flex items-center justify-center shadow-lg">
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
                  {balance?.direction === 'you_owe' ? t('expenses.me') : counterpartyName}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-inner">
                  <Plus className="w-6 h-6 rotate-45" />
                </div>
                <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 bg-primary/5 flex items-center justify-center shadow-lg">
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
                  {balance?.direction === 'you_are_owed' ? t('expenses.me') : counterpartyName}
                </span>
              </div>
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
