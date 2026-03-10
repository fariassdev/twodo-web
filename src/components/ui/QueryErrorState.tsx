import React from 'react';
import { useTranslation } from 'react-i18next';

type QueryErrorStateProps = {
  onRetry: () => void;
};

export default function QueryErrorState({ onRetry }: QueryErrorStateProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="mx-auto my-6 flex w-full max-w-md flex-col items-center gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-5 text-center">
      <p className="text-sm font-semibold text-rose-100">{t('queryState.loadErrorTitle')}</p>
      <p className="text-xs text-rose-100/80">{t('queryState.loadErrorDescription')}</p>
      <button
        className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-50 transition-colors hover:bg-rose-500/30"
        onClick={onRetry}
        type="button"
      >
        {t('queryState.retry')}
      </button>
    </div>
  );
}
