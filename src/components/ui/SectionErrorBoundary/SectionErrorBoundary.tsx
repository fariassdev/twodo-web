import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import ErrorPage from '../ErrorPage';

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
      fallbackRender={({ error, resetErrorBoundary }) => {
        const normalizedError = error instanceof Error ? error : new Error(String(error));

        return (
          <ErrorPage
            error={normalizedError}
            onRetry={() => handleRetry(normalizedError, resetErrorBoundary)}
            description={t('runtimeBoundary.description', {
              section: sectionName ?? t('runtimeBoundary.defaultSection'),
            })}
          />
        );
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
