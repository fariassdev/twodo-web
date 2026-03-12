import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { swapSuccessRoute } from '../router';

export default function SwapSuccess() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { myTaskTitle, partnerTaskTitle, partnerName } = swapSuccessRoute.useSearch();

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-6">
      {/* Background card */}
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-800/60 to-slate-900/60 border border-slate-700 rounded-3xl overflow-hidden p-8 flex flex-col items-center gap-6 shadow-2xl">

        {/* Confetti accents */}
        <span className="absolute top-6 right-6 material-symbols-outlined text-3xl text-primary/60 rotate-12">celebration</span>
        <span className="absolute top-10 left-6 material-symbols-outlined text-xl text-primary/40 -rotate-6">favorite</span>

        {/* Hero icon */}
        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/40">
          <span className="material-symbols-outlined text-5xl text-primary">handshake</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-black text-center">{t('swap.success.title')}</h1>

        {/* Task swap summary */}
        {(myTaskTitle || partnerTaskTitle) && (
          <div className="flex items-center gap-3 justify-center flex-wrap">
            {myTaskTitle && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-slate-400">task_alt</span>
                </div>
                <span className="text-xs text-slate-400 text-center max-w-[80px] leading-tight">{myTaskTitle}</span>
              </div>
            )}
            <span className="material-symbols-outlined text-2xl text-primary">swap_horiz</span>
            {partnerTaskTitle && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-primary">pets</span>
                </div>
                <span className="text-xs text-slate-400 text-center max-w-[80px] leading-tight">{partnerTaskTitle}</span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {myTaskTitle && partnerTaskTitle && (
          <p className="text-center text-sm leading-relaxed">
            {t('swap.success.swapped')}{' '}
            <span className="font-bold text-primary">{myTaskTitle}</span>{' '}
            {t('swap.success.for')}{' '}
            <span className="font-bold text-primary">{partnerTaskTitle}</span>
          </p>
        )}

        {/* Notification hint */}
        {partnerName && (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span className="material-symbols-outlined text-base">notifications</span>
            <span>{t('swap.success.partnerNotified', { name: partnerName })}</span>
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate({ to: '/' })}
        className="mt-8 w-full max-w-sm bg-primary text-background-dark h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform"
      >
        {t('swap.success.cta')}
      </button>
      <p className="mt-3 text-xs text-slate-500">{t('swap.success.hint')}</p>
    </div>
  );
}
