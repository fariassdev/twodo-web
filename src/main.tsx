import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { router } from './router.tsx';
import {
  queryClient,
  queryDehydrateOptions,
  queryPersister,
  queryPersistenceMaxAge,
} from './lib/queryClient';
import './index.css';
import './i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: queryPersistenceMaxAge,
        dehydrateOptions: queryDehydrateOptions,
      }}
      onSuccess={() => {
        queryClient.resumePausedMutations().catch(() => undefined);
      }}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  </StrictMode>,
);
