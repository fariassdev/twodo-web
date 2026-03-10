import {
  QueryClient,
  defaultShouldDehydrateQuery,
  onlineManager,
  type DehydrateOptions,
} from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { del, get, set } from 'idb-keyval';
import { queryKeys } from './queryKeys';

const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;
const calendarRootKey = ['calendar'] as const;

function isRetriableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return true;

  const status = (error as { status?: number }).status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return false;
  }

  const code = (error as { code?: string }).code;
  if (code === 'PGRST116') {
    return false;
  }

  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 60 * 12,
      retry: (failureCount, error) => failureCount < 3 && isRetriableError(error),
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error) => failureCount < 2 && isRetriableError(error),
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
    },
  },
});

queryClient.setQueryDefaults(queryKeys.profiles.all, {
  staleTime: 1000 * 60 * 10,
  gcTime: CACHE_MAX_AGE_MS,
});

queryClient.setQueryDefaults(queryKeys.tasks.all, {
  staleTime: 1000 * 30,
  gcTime: 1000 * 60 * 60 * 6,
});

queryClient.setQueryDefaults(calendarRootKey, {
  staleTime: 1000 * 60,
  gcTime: 1000 * 60 * 60 * 3,
});

queryClient.setQueryDefaults(queryKeys.metrics.all, {
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 60,
});

queryClient.setQueryDefaults(queryKeys.shopping.all, {
  staleTime: 1000 * 20,
  gcTime: 1000 * 60 * 30,
});

queryClient.setQueryDefaults(queryKeys.loveNotes.all, {
  staleTime: 1000 * 60 * 2,
  gcTime: 1000 * 60 * 60,
});

const asyncStorage = {
  getItem: async (key: string) => {
    const value = await get<string>(key);
    return value ?? null;
  },
  setItem: async (key: string, value: string) => {
    await set(key, value);
  },
  removeItem: async (key: string) => {
    await del(key);
  },
};

export const queryPersister = createAsyncStoragePersister({
  key: 'couple-organizer-query-cache-v1',
  storage: asyncStorage,
  throttleTime: 1000,
});

export const queryDehydrateOptions: DehydrateOptions = {
  shouldDehydrateQuery: (query) =>
    defaultShouldDehydrateQuery(query) && query.state.status === 'success',
};

if (typeof window !== 'undefined') {
  onlineManager.setEventListener((setOnline) => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  });
}

export const queryPersistenceMaxAge = CACHE_MAX_AGE_MS;
