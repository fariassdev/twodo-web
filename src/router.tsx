import React, { Suspense } from 'react';
import {
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from '@tanstack/react-router';
import { useLanguageChange } from './hooks/useLanguageChange';
import { useScreenTelemetry } from './hooks/useScreenTelemetry';
import { useAuthContextQuery } from './lib/queryHooks';
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
const Login = React.lazy(() => import('./components/auth/Login'));
const Register = React.lazy(() => import('./components/auth/Register'));
const PendingAccess = React.lazy(() => import('./components/auth/PendingAccess'));

const AuthQueryContext = React.createContext<ReturnType<typeof useAuthContextQuery> | null>(null);

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
  const authContextQuery = useAuthContextQuery();
  useLanguageChange();
  useScreenTelemetry(pathname);

  return (
    <AuthQueryContext.Provider value={authContextQuery}>
      <div className="bg-background-dark text-slate-100 min-h-screen font-display flex flex-col">
        <Outlet />
      </div>
    </AuthQueryContext.Provider>
  );
}

function useGateAuthQuery() {
  const authContextQuery = React.useContext(AuthQueryContext);

  if (!authContextQuery) {
    throw new Error('Auth query context is not available in route gate');
  }

  return authContextQuery;
}

function PublicOnlyOutlet() {
  const authContextQuery = useGateAuthQuery();

  if (authContextQuery.isPending) {
    return <RouteLoadingFallback />;
  }

  const status = authContextQuery.data?.status ?? 'signed_out';

  if (status === 'linked') {
    return <Navigate to="/" replace />;
  }

  if (status === 'pending_profile' || status === 'pending_household') {
    return <Navigate to="/pending-access" replace />;
  }

  return <Outlet />;
}

function SessionRequiredOutlet() {
  const authContextQuery = useGateAuthQuery();

  if (authContextQuery.isPending) {
    return <RouteLoadingFallback />;
  }

  const status = authContextQuery.data?.status ?? 'signed_out';

  if (status === 'signed_out') {
    return <Navigate to="/auth/login" replace />;
  }

  if (status === 'linked') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function LinkedAppOutlet() {
  const authContextQuery = useGateAuthQuery();

  if (authContextQuery.isPending) {
    return <RouteLoadingFallback />;
  }

  const status = authContextQuery.data?.status ?? 'signed_out';

  if (status === 'signed_out') {
    return <Navigate to="/auth/login" replace />;
  }

  if (status === 'pending_profile' || status === 'pending_household') {
    return <Navigate to="/pending-access" replace />;
  }

  return <Outlet />;
}

export const rootRoute = createRootRoute({
  component: RootComponent,
});

export const authGateRoute = createRoute({
  id: 'authGate',
  getParentRoute: () => rootRoute,
  component: PublicOnlyOutlet,
});

export const authIndexRoute = createRoute({
  getParentRoute: () => authGateRoute,
  path: '/auth',
  component: () => <Navigate to="/auth/login" replace />,
});

export const loginRoute = createRoute({
  getParentRoute: () => authGateRoute,
  path: '/auth/login',
  component: () => (
    <RouteShell sectionName="login">
      <Login />
    </RouteShell>
  ),
});

export const registerRoute = createRoute({
  getParentRoute: () => authGateRoute,
  path: '/auth/register',
  component: () => (
    <RouteShell sectionName="register">
      <Register />
    </RouteShell>
  ),
});

export const sessionGateRoute = createRoute({
  id: 'sessionGate',
  getParentRoute: () => rootRoute,
  component: SessionRequiredOutlet,
});

export const pendingAccessRoute = createRoute({
  getParentRoute: () => sessionGateRoute,
  path: '/pending-access',
  component: () => (
    <RouteShell sectionName="pending-access">
      <PendingAccess />
    </RouteShell>
  ),
});

export const privateGateRoute = createRoute({
  id: 'privateGate',
  getParentRoute: () => rootRoute,
  component: LinkedAppOutlet,
});

export const mainLayoutRoute = createRoute({
  id: 'mainLayout',
  getParentRoute: () => privateGateRoute,
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

export const profileRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/profile',
  component: () => (
    <RouteShell sectionName="profile">
      <Profile />
    </RouteShell>
  ),
});

export const taskDetailsRoute = createRoute({
  getParentRoute: () => privateGateRoute,
  path: '/task/$taskId',
  component: () => (
    <RouteShell sectionName="task-details">
      <TaskDetails />
    </RouteShell>
  ),
});

export const editEntryRoute = createRoute({
  getParentRoute: () => privateGateRoute,
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
  getParentRoute: () => privateGateRoute,
  path: '/create',
  validateSearch: (search: Record<string, unknown>): CreateEntrySearch => {
    return {
      date: typeof search?.date === 'string' ? search.date : undefined,
      type:
        typeof search?.type === 'string' && (search.type === 'task' || search.type === 'event')
          ? search.type
          : undefined,
    };
  },
  component: () => (
    <RouteShell sectionName="create-entry">
      <CreateEntry />
    </RouteShell>
  ),
});

const routeTree = rootRoute.addChildren([
  authGateRoute.addChildren([authIndexRoute, loginRoute, registerRoute]),
  sessionGateRoute.addChildren([pendingAccessRoute]),
  privateGateRoute.addChildren([
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
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
