import React, { Suspense } from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';
import { useLanguageChange } from './hooks/useLanguageChange';
import { useScreenTelemetry } from './hooks/useScreenTelemetry';
import BottomNav from './components/ui/BottomNav';
import SectionErrorBoundary from './components/ui/SectionErrorBoundary';

const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Calendar = React.lazy(() => import('./components/Calendar'));
const Metrics = React.lazy(() => import('./components/Metrics'));
const ShoppingList = React.lazy(() => import('./components/ShoppingList'));
const TaskDetails = React.lazy(() => import('./components/TaskDetails'));
const Profile = React.lazy(() => import('./components/Profile'));
const EditEntry = React.lazy(() => import('./components/EditEntry'));
const CreateEntry = React.lazy(() => import('./components/CreateEntry'));

function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
    </div>
  );
}

function RouteShell({ children, sectionName }: { children: React.ReactNode; sectionName: string }) {
  return (
    <SectionErrorBoundary sectionName={sectionName}>
      <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>
    </SectionErrorBoundary>
  );
}

function RootComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useLanguageChange();
  useScreenTelemetry(pathname);

  return (
    <div className="bg-background-dark text-slate-100 min-h-screen font-display flex flex-col">
      <Outlet />
    </div>
  );
}

export const rootRoute = createRootRoute({
  component: RootComponent,
});

export const mainLayoutRoute = createRoute({
  id: 'mainLayout',
  getParentRoute: () => rootRoute,
  component: () => (
    <>
      <Outlet />
      <BottomNav />
    </>
  ),
});

export const dashboardRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/',
  component: () => (
    <RouteShell sectionName="dashboard">
      <Dashboard />
    </RouteShell>
  ),
});

export const calendarRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/calendar',
  component: () => (
    <RouteShell sectionName="calendar">
      <Calendar />
    </RouteShell>
  ),
});

export const metricsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/metrics',
  component: () => (
    <RouteShell sectionName="metrics">
      <Metrics />
    </RouteShell>
  ),
});

export const shoppingRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/shopping',
  component: () => (
    <RouteShell sectionName="shopping">
      <ShoppingList />
    </RouteShell>
  ),
});

export const taskDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/task/$taskId',
  component: () => (
    <RouteShell sectionName="task-details">
      <TaskDetails />
    </RouteShell>
  ),
});

export const profileRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/profile',
  component: () => (
    <RouteShell sectionName="profile">
      <Profile />
    </RouteShell>
  ),
});

export const editEntryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/task/$taskId/edit',
  component: () => (
    <RouteShell sectionName="edit-entry">
      <EditEntry />
    </RouteShell>
  ),
});

interface CreateEntrySearch {
  date?: string;
  type?: 'task' | 'event';
}

export const createEntryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create',
  validateSearch: (search: Record<string, unknown>): CreateEntrySearch => {
    return {
      date: typeof search?.date === 'string' ? search.date : undefined,
      type:
        typeof search?.type === 'string' && (search.type === 'task' || search.type === 'event')
          ? search.type
          : undefined,
    }
  },
  component: () => (
    <RouteShell sectionName="create-entry">
      <CreateEntry />
    </RouteShell>
  ),
});

const routeTree = rootRoute.addChildren([
  mainLayoutRoute.addChildren([
    dashboardRoute,
    calendarRoute,
    metricsRoute,
    shoppingRoute,
    profileRoute,
  ]),
  taskDetailsRoute,
  editEntryRoute,
  createEntryRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
