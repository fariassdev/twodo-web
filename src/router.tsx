import React, { Suspense } from 'react';
import i18n from './i18n';
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
import { useAuthState } from './context/AuthContext';
import BottomNav from './components/ui/BottomNav';
import SectionErrorBoundary from './components/ui/SectionErrorBoundary';
import FullPageLoading from './components/ui/FullPageLoading';
import ErrorPage from './components/ui/ErrorPage';

const Dashboard = React.lazy(() => import('./components/dashboard'));
const Calendar = React.lazy(() => import('./components/Calendar'));
const Metrics = React.lazy(() => import('./components/Metrics'));
const ShoppingList = React.lazy(() => import('./components/ShoppingList'));
const TaskDetails = React.lazy(() => import('./components/Tasks/TaskDetails'));
const Profile = React.lazy(() => import('./components/Profile'));
const EditEntry = React.lazy(() => import('./components/Tasks/EditEntry'));
const CreateEntry = React.lazy(() => import('./components/Tasks/CreateEntry'));
const ExpensesDashboard = React.lazy(() => import('./components/expenses/ExpensesDashboard'));
const CreateExpense = React.lazy(() => import('./components/expenses/CreateExpense'));
const EditExpense = React.lazy(() => import('./components/expenses/EditExpense'));
const ExpensesListPage = React.lazy(() => import('./components/expenses/ExpensesListPage'));
const ExpenseDetails = React.lazy(() => import('./components/expenses/ExpenseDetails'));
const SettleBalance = React.lazy(() => import('./components/expenses/SettleBalance'));
const Login = React.lazy(() => import('./components/Auth/Login'));
const Register = React.lazy(() => import('./components/Auth/Register'));
const ForgotPassword = React.lazy(() => import('./components/Auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./components/Auth/ResetPassword'));
const VerifyEmail = React.lazy(() => import('./components/Auth/VerifyEmail'));
const PendingAccess = React.lazy(() => import('./components/Auth/PendingAccess'));
const TaskAssignment = React.lazy(() => import('./components/Tasks/TaskAssignment/TaskAssignment'));


function RouteLoadingFallback() {
  return <FullPageLoading message={i18n.t('loading')} />;
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
    <div className="bg-background-dark text-surface-2 min-h-dvh font-display flex flex-col">
      <Outlet />
    </div>
  );
}

function PublicOnlyOutlet() {
  const { status } = useAuthState();

  if (status === 'loading') return <RouteLoadingFallback />;
  if (status === 'linked') return <Navigate to="/" replace />;
  if (status === 'pending_profile' || status === 'pending_household') {
    return <Navigate to="/pending-access" replace />;
  }

  return <Outlet />;
}

function SessionRequiredOutlet() {
  const { status } = useAuthState();

  if (status === 'loading') return <RouteLoadingFallback />;
  if (status === 'signed_out') return <Navigate to="/auth/login" replace />;
  if (status === 'linked') return <Navigate to="/" replace />;

  return <Outlet />;
}

function LinkedAppOutlet() {
  const { status } = useAuthState();

  if (status === 'loading') return <RouteLoadingFallback />;
  if (status === 'signed_out') return <Navigate to="/auth/login" replace />;
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

export const forgotPasswordRoute = createRoute({
  getParentRoute: () => authGateRoute,
  path: '/auth/forgot-password',
  component: () => (
    <RouteShell sectionName="forgot-password">
      <ForgotPassword />
    </RouteShell>
  ),
});

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/reset-password',
  component: () => (
    <RouteShell sectionName="reset-password">
      <ResetPassword />
    </RouteShell>
  ),
});

interface VerifyEmailSearch {
  email?: string;
}

export const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/verify-email',
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => ({
    email: typeof search?.email === 'string' ? search.email : undefined,
  }),
  component: () => {
    const { email } = verifyEmailRoute.useSearch();
    return (
      <RouteShell sectionName="verify-email">
        <VerifyEmail email={email} />
      </RouteShell>
    );
  },
});

interface JoinSearch {
  code?: string;
}

function JoinRedirect() {
  const { code } = joinRoute.useSearch();
  const { status } = useAuthState();

  React.useEffect(() => {
    if (code) {
      sessionStorage.setItem('pendingInviteCode', code.trim().toUpperCase());
    }
  }, [code]);

  if (status === 'loading') return <RouteLoadingFallback />;
  if (status === 'signed_out') return <Navigate to="/auth/login" replace />;
  if (status === 'pending_profile' || status === 'pending_household') {
    return <Navigate to="/pending-access" replace />;
  }

  return <Navigate to="/" replace />;
}

export const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/join',
  validateSearch: (search: Record<string, unknown>): JoinSearch => ({
    code: typeof search?.code === 'string' ? search.code : undefined,
  }),
  component: JoinRedirect,
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
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  ),
});

export const fullscreenLayoutRoute = createRoute({
  id: 'fullscreenLayout',
  getParentRoute: () => privateGateRoute,
  component: () => (
    <div className="flex h-dvh flex-col overflow-y-auto custom-scrollbar bg-background-light">
      <Outlet />
    </div>
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

export type NavigationOrigin = 'dashboard' | 'search' | 'calendar';

export interface ExpensesListSearch {
  q?: string;
  categoryId?: string;
  paidByProfileId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ExpenseDetailsSearch extends ExpensesListSearch {
  from?: NavigationOrigin;
}

export interface TaskDetailsSearch {
  from?: NavigationOrigin;
}

function readSearchValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function readDateSearchValue(value: unknown): string | undefined {
  const searchValue = readSearchValue(value);
  if (!searchValue) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(searchValue) ? searchValue : undefined;
}

function readExpenseFromSearch(value: unknown): ExpenseDetailsSearch['from'] {
  if (value === 'dashboard' || value === 'search' || value === 'calendar') {
    return value;
  }

  return undefined;
}

export const expensesDashboardRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/expenses',
  component: () => (
    <RouteShell sectionName="expenses-dashboard">
      <ExpensesDashboard />
    </RouteShell>
  ),
});

export const expensesListRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/expenses/list',
  validateSearch: (search: Record<string, unknown>): ExpensesListSearch => ({
    q: readSearchValue(search?.q),
    categoryId: readSearchValue(search?.categoryId),
    paidByProfileId: readSearchValue(search?.paidByProfileId),
    fromDate: readDateSearchValue(search?.fromDate),
    toDate: readDateSearchValue(search?.toDate),
  }),
  component: () => (
    <RouteShell sectionName="expenses-list">
      <ExpensesListPage />
    </RouteShell>
  ),
});


export const taskAssignmentRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: '/task/$taskId/assignment',
  component: () => (
    <RouteShell sectionName="task-assignment">
      <TaskAssignment />
    </RouteShell>
  ),
});

export const taskDetailsRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: '/task/$taskId',
  validateSearch: (search: Record<string, unknown>): TaskDetailsSearch => ({
    from: (search?.from === 'dashboard' || search?.from === 'calendar') ? (search.from as TaskDetailsSearch['from']) : undefined,
  }),
  component: () => (
    <RouteShell sectionName="task-details">
      <TaskDetails />
    </RouteShell>
  ),
});

export const editEntryRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
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
  startTime?: string;
  endTime?: string;
}

export const createEntryRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: '/create',
  validateSearch: (search: Record<string, unknown>): CreateEntrySearch => {
    return {
      date: typeof search?.date === 'string' ? search.date : undefined,
      type:
        typeof search?.type === 'string' && (search.type === 'task' || search.type === 'event')
          ? search.type
          : undefined,
      startTime: typeof search?.startTime === 'string' ? search.startTime : undefined,
      endTime: typeof search?.endTime === 'string' ? search.endTime : undefined,
    };
  },
  component: () => (
    <RouteShell sectionName="create-entry">
      <CreateEntry />
    </RouteShell>
  ),
});

export const createExpenseRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: '/expenses/new',
  component: () => (
    <RouteShell sectionName="expenses-new">
      <CreateExpense />
    </RouteShell>
  ),
});

export const editExpenseRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: '/expenses/$expenseId/edit',
  validateSearch: (search: Record<string, unknown>): ExpenseDetailsSearch => ({
    from: readExpenseFromSearch(search?.from),
    q: readSearchValue(search?.q),
    categoryId: readSearchValue(search?.categoryId),
    paidByProfileId: readSearchValue(search?.paidByProfileId),
    fromDate: readDateSearchValue(search?.fromDate),
    toDate: readDateSearchValue(search?.toDate),
  }),
  component: () => (
    <RouteShell sectionName="expenses-edit">
      <EditExpense />
    </RouteShell>
  ),
});

export const expenseDetailsRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: '/expenses/$expenseId',
  validateSearch: (search: Record<string, unknown>): ExpenseDetailsSearch => ({
    from: readExpenseFromSearch(search?.from),
    q: readSearchValue(search?.q),
    categoryId: readSearchValue(search?.categoryId),
    paidByProfileId: readSearchValue(search?.paidByProfileId),
    fromDate: readDateSearchValue(search?.fromDate),
    toDate: readDateSearchValue(search?.toDate),
  }),
  component: () => (
    <RouteShell sectionName="expense-details">
      <ExpenseDetails />
    </RouteShell>
  ),
});

export const settleBalanceRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: '/expenses/settle',
  component: () => (
    <RouteShell sectionName="settle-balance">
      <SettleBalance />
    </RouteShell>
  ),
});

const routeTree = rootRoute.addChildren([
  authGateRoute.addChildren([authIndexRoute, loginRoute, registerRoute, forgotPasswordRoute]),
  resetPasswordRoute,
  verifyEmailRoute,
  joinRoute,
  sessionGateRoute.addChildren([pendingAccessRoute]),
  privateGateRoute.addChildren([
    mainLayoutRoute.addChildren([
      dashboardRoute,
      calendarRoute,
      metricsRoute,
      shoppingRoute,
      profileRoute,
      expensesDashboardRoute,
      expensesListRoute,
    ]),
    fullscreenLayoutRoute.addChildren([
      taskDetailsRoute,
      editEntryRoute,
      taskAssignmentRoute,
      createEntryRoute,
      createExpenseRoute,
      editExpenseRoute,
      expenseDetailsRoute,
      settleBalanceRoute,
    ]),
  ]),
]);

export const router = createRouter({ 
  routeTree,
  defaultErrorComponent: ({ error, reset }) => (
    <ErrorPage 
      error={error} 
      onRetry={reset} 
    />
  ),
  defaultNotFoundComponent: () => (
    <ErrorPage 
      title={i18n.t('errorPage.notFoundTitle')} 
      description={i18n.t('errorPage.notFoundDescription')} 
    />
  ),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
