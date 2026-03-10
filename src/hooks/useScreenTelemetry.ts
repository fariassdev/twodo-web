import { useEffect } from 'react';
import { setActiveRoute, trackScreenDuration } from '../lib/telemetry';

export function useScreenTelemetry(pathname: string): void {
  useEffect(() => {
    setActiveRoute(pathname);
    const stop = trackScreenDuration(pathname);
    return stop;
  }, [pathname]);
}
