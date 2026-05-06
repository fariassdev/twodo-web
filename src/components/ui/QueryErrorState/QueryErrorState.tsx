import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Button';
import Card from '../Card';
import IconBox from '../IconBox';

type QueryErrorStateProps = {
  onRetry: () => void;
};

export default function QueryErrorState({ onRetry }: QueryErrorStateProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="flex w-full items-center justify-center p-4">
      <Card
        variant="elevated"
        className="flex max-w-sm flex-col items-center text-center shadow-card-lg"
        padding="xl"
      >
        <IconBox tone="primary" size="lg" className="mb-4">
          <span className="material-symbols-outlined !text-3xl">wifi_off</span>
        </IconBox>

        <h3 className="text-lg font-bold text-surface-2">
          {t('queryState.loadErrorTitle')}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-surface-2/70">
          {t('queryState.loadErrorDescription')}
        </p>

        <Button
          variant="primary"
          className="mt-6"
          fullWidth
          onClick={onRetry}
          startIcon={<span className="material-symbols-outlined !text-lg">refresh</span>}
        >
          {t('queryState.retry')}
        </Button>
      </Card>
    </div>
  );
}
