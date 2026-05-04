import type { QueryClient } from '@tanstack/react-query';

type TelemetryState = {
  activeRoute: string;
  appStartedAt: number;
  requestsByRoute: Record<string, number>;
  mutationErrorsByRoute: Record<string, number>;
  screenDurationsMs: Record<string, number[]>;
};

const telemetryState: TelemetryState = {
  activeRoute: 'unknown',
  appStartedAt: Date.now(),
  requestsByRoute: {},
  mutationErrorsByRoute: {},
  screenDurationsMs: {},
};

const queryFetchStatusByHash = new Map<string, string>();
const mutationStatusByRef = new WeakMap<object, string>();

function normalizeRoute(pathname: string): string {
  if (/^\/task\/[^/]+\/edit$/.test(pathname)) return '/task/$taskId/edit';
  if (/^\/task\/[^/]+$/.test(pathname)) return '/task/$taskId';
  if (/^\/create/.test(pathname)) return '/create';
  return pathname || 'unknown';
}

function incrementCounter(target: Record<string, number>, route: string): void {
  target[route] = (target[route] ?? 0) + 1;
}

function logDebug(message: string, extra?: unknown): void {
  if (!import.meta.env.DEV) return;
  if (typeof extra !== 'undefined') {
    console.debug('[telemetry]', message, extra);
    return;
  }
  console.debug('[telemetry]', message);
}

export function markAppBoot(): void {
  telemetryState.appStartedAt = Date.now();
  logDebug('app boot marked');
}

export function setActiveRoute(pathname: string): void {
  const route = normalizeRoute(pathname);
  telemetryState.activeRoute = route;
}

export function trackScreenDuration(pathname: string): () => void {
  const route = normalizeRoute(pathname);
  setActiveRoute(route);
  const startedAt = performance.now();

  return () => {
    const duration = Math.max(0, performance.now() - startedAt);
    telemetryState.screenDurationsMs[route] = telemetryState.screenDurationsMs[route] ?? [];
    telemetryState.screenDurationsMs[route].push(duration);
    logDebug('screen duration recorded', {
      route,
      durationMs: Math.round(duration),
    });
  };
}

export function recordRequestForActiveRoute(): void {
  incrementCounter(telemetryState.requestsByRoute, telemetryState.activeRoute);
}

export function recordMutationErrorForActiveRoute(): void {
  incrementCounter(telemetryState.mutationErrorsByRoute, telemetryState.activeRoute);
}

export function getTelemetrySnapshot(): TelemetryState {
  return {
    activeRoute: telemetryState.activeRoute,
    appStartedAt: telemetryState.appStartedAt,
    requestsByRoute: { ...telemetryState.requestsByRoute },
    mutationErrorsByRoute: { ...telemetryState.mutationErrorsByRoute },
    screenDurationsMs: Object.fromEntries(
      Object.entries(telemetryState.screenDurationsMs).map(([route, values]) => [route, [...values]]),
    ),
  };
}

export function attachReactQueryTelemetry(queryClient: QueryClient): () => void {
  const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return;

    const query = event.query;
    const previousStatus = queryFetchStatusByHash.get(query.queryHash);
    const currentStatus = query.state.fetchStatus;

    if (previousStatus !== 'fetching' && currentStatus === 'fetching') {
      recordRequestForActiveRoute();
    }

    queryFetchStatusByHash.set(query.queryHash, currentStatus);
  });

  const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
    if (!event.mutation) return;

    const mutationRef = event.mutation as unknown as object;
    const previousStatus = mutationStatusByRef.get(mutationRef);
    const currentStatus = event.mutation.state.status;

    if (previousStatus !== 'error' && currentStatus === 'error') {
      recordMutationErrorForActiveRoute();
      logDebug('mutation error recorded', {
        route: telemetryState.activeRoute,
        mutationKey: event.mutation.options.mutationKey,
      });
    }

    mutationStatusByRef.set(mutationRef, currentStatus);
  });

  return () => {
    unsubscribeQueries();
    unsubscribeMutations();
  };
}

export function exposeTelemetryOnWindow(): void {
  if (typeof window === 'undefined') return;
  const withTelemetry = window as Window & {
    __twodoTelemetry?: {
      snapshot: typeof getTelemetrySnapshot;
    };
  };

  withTelemetry.__twodoTelemetry = {
    snapshot: getTelemetrySnapshot,
  };
}
