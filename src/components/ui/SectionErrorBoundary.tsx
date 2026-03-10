import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

function isRecoverableModuleLoadError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('chunkloaderror') ||
    message.includes('loading chunk')
  );
}

type SectionErrorBoundaryProps = {
  children: React.ReactNode;
  sectionName?: string;
};

export default function SectionErrorBoundary({
  children,
  sectionName,
}: SectionErrorBoundaryProps): React.ReactElement {
  const { t } = useTranslation();

  function handleRetry(error: Error, resetErrorBoundary: () => void): void {
    const canReload =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.onLine;

    if (canReload && isRecoverableModuleLoadError(error)) {
      window.location.reload();
      return;
    }

    resetErrorBoundary();
  }

  return (
    <ErrorBoundary
      onError={(error) => {
        console.error('Section error boundary captured:', error);
      }}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="mx-auto my-4 w-full max-w-md rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm">
          <p className="font-semibold text-rose-200">{t('runtimeBoundary.title')}</p>
          <p className="mt-1 text-rose-100/80">{t('runtimeBoundary.description', { section: sectionName ?? t('runtimeBoundary.defaultSection') })}</p>
          {import.meta.env.DEV && <p className="mt-2 break-words text-xs text-rose-100/70">{error.message}</p>}
          <button
            className="mt-3 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-100 transition-colors hover:bg-rose-500/30"
            onClick={() => handleRetry(error, resetErrorBoundary)}
            type="button"
          >
            {t('runtimeBoundary.retry')}
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
