import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { useNavigate } from '@tanstack/react-router';
import Button from '../Button';
import TwodoLogo from '../TwodoLogo';

interface ErrorPageProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  error?: Error;
}

export default function ErrorPage({
  title,
  description,
  onRetry,
  error,
}: ErrorPageProps): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const displayTitle = title ?? t('runtimeBoundary.title');
  const displayDescription = description ?? t('runtimeBoundary.description', { section: t('runtimeBoundary.defaultSection') });

  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = () => {
    const textToCopy = error?.stack || error?.message || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };



  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-light py-12 text-center">
      {/* Background Decorative Elements */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
        className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-surface-2/5 blur-3xl"
      />


      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-4 px-6">
        {/* Logo Section */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <TwodoLogo width={160} className="mb-12" />
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative mb-12 flex flex-col items-center"
        >
          {/* Artistic Watermark Heart (Heartbeat Animation) */}
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1, 1.1, 1],
              opacity: [0.04, 0.08, 0.04, 0.12, 0.04]
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              times: [0, 0.1, 0.2, 0.4, 1],
              ease: 'easeInOut' 
            }}
            className="pointer-events-none absolute -top-20 flex items-center justify-center"
          >
            <span className="material-symbols-outlined !text-[16rem] text-primary">
              heart_broken
            </span>
          </motion.div>

          <h1 className="relative mb-4 text-3xl font-black tracking-tight text-surface-2 sm:text-4xl">
            {displayTitle}
          </h1>
          <p className="relative max-w-sm text-lg leading-relaxed text-surface-2/60">
            {displayDescription}
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex w-full flex-col gap-4 sm:flex-row sm:justify-center"
        >
          {onRetry && (
            <Button
              variant="primary"
              size="lg"
              onClick={onRetry}
              startIcon={<span className="material-symbols-outlined">refresh</span>}
              className="min-w-[180px] shadow-glow-primary"
            >
              {t('runtimeBoundary.retry')}
            </Button>
          )}
          <Button
            variant="subtle"
            size="lg"
            onClick={() => navigate({ to: '/' })}
            className="min-w-[180px]"
          >
            {t('runtimeBoundary.backHome')}
          </Button>
        </motion.div>

        {/* Debug Information (only in DEV) */}
        {import.meta.env.DEV && error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-12 w-full max-w-md overflow-hidden rounded-2xl border border-danger/10 bg-white/40 p-5 text-left backdrop-blur-sm"
          >
            <div className="mb-3 flex items-center justify-between text-danger/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">terminal</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Developer Debugging Info
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 w-6 p-0 hover:bg-danger/10 hover:text-danger"
                title={t('common.copy') || 'Copy'}
              >
                <motion.span
                  key={isCopied ? 'check' : 'copy'}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="material-symbols-outlined text-[16px]"
                >
                  {isCopied ? 'check' : 'content_copy'}
                </motion.span>
              </Button>
            </div>
            <div className="custom-scrollbar max-h-32 overflow-y-auto">
              <p className="font-mono text-[11px] leading-relaxed text-danger/80">
                {error.stack || error.message}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
