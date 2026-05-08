import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { useNavigate } from '@tanstack/react-router';
import Button from '../Button';

type QueryErrorStateProps = {
  onRetry: () => void;
  onBack?: () => void;
  title?: string;
  description?: string;
};

export default function QueryErrorState({ 
  onRetry, 
  onBack,
  title,
  description
}: QueryErrorStateProps): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const displayTitle = title ?? t('queryState.loadErrorTitle');
  const displayDescription = description ?? t('queryState.loadErrorDescription');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      void navigate({ to: '/' });
    }
  };

  return (
    <div className="relative flex min-h-[300px] w-full flex-1 flex-col items-center justify-center overflow-hidden py-12 text-center">
      {/* Background blobs for premium feel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-primary/5 blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
        className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-surface-2/5 blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center px-6">
        {/* Stylized Icon Area */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative mb-8"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-surface-1 shadow-card-lg border border-border-subtle">
             <span className="material-symbols-outlined !text-4xl text-primary">
               wifi_off
             </span>
          </div>
          {/* Subtle pulse ring */}
          <div className="absolute inset-0 -z-10 animate-ping rounded-[2rem] bg-primary/10 opacity-20" />
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="mb-3 text-xl font-bold tracking-tight text-surface-2">
            {displayTitle}
          </h3>
          <p className="text-sm leading-relaxed text-surface-2/60">
            {displayDescription}
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex w-full flex-col gap-3"
        >
          <Button
            variant="primary"
            size="lg"
            onClick={onRetry}
            startIcon={<span className="material-symbols-outlined !text-lg">refresh</span>}
            fullWidth
            className="shadow-glow-primary"
          >
            {t('queryState.retry')}
          </Button>

          <Button
            variant="subtle"
            size="lg"
            onClick={handleBack}
            fullWidth
          >
            {t('runtimeBoundary.backHome')}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
