import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type DataStatusBannerProps = {
  isOffline: boolean;
  isStale: boolean;
  isFetching?: boolean;
};

const STALE_BANNER_DELAY_MS = 5000;

export default function DataStatusBanner({
  isOffline,
  isStale,
  isFetching = false,
}: DataStatusBannerProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [showStaleBanner, setShowStaleBanner] = useState(false);

  const shouldDelayStaleBanner = !isOffline && isStale && isFetching;

  useEffect(() => {
    if (!shouldDelayStaleBanner) {
      setShowStaleBanner(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowStaleBanner(true);
    }, STALE_BANNER_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [shouldDelayStaleBanner]);

  if (isOffline) {
    return (
      <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-100">
        {t('dataStatus.offline')}
      </div>
    );
  }

  if (!showStaleBanner) {
    return null;
  }

  return (
    <div className="mb-3 rounded-xl border border-slate-400/40 bg-slate-500/10 px-3 py-2 text-xs font-medium text-slate-200">
      {t('dataStatus.stale')}
    </div>
  );
}
