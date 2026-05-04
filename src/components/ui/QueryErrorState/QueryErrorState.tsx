import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Button';
import ErrorBanner from '../ErrorBanner';

type QueryErrorStateProps = {
  onRetry: () => void;
};

export default function QueryErrorState({ onRetry }: QueryErrorStateProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <ErrorBanner className="mx-auto my-6 flex w-full max-w-md flex-col items-center gap-3 px-5 py-5 text-center" message={(
      <>
        <p className="text-sm font-semibold text-rose-100">{t('queryState.loadErrorTitle')}</p>
        <p className="text-xs text-rose-100/80">{t('queryState.loadErrorDescription')}</p>
        <Button onClick={onRetry} size="sm" variant="danger">
          {t('queryState.retry')}
        </Button>
      </>
    )} />
  );
}
