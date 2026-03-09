import React from 'react';
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import TaskDetails from './components/TaskDetails';
import EditEntry from './components/EditEntry';
import CreateEntry from './components/CreateEntry';
import Metrics from './components/Metrics';
import ShoppingList from './components/ShoppingList';
import Profile from './components/Profile';
import BottomNav from './components/BottomNav';

export const rootRoute = createRootRoute({
  component: () => (
    <div className="bg-background-dark text-slate-100 min-h-screen font-display flex flex-col">
      <Outlet />
    </div>
  ),
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
  component: Dashboard,
});

export const calendarRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/calendar',
  component: Calendar,
});

export const metricsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/metrics',
  component: Metrics,
});

export const shoppingRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/shopping',
  component: ShoppingList,
});

export const taskDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/task/$taskId',
  component: TaskDetails,
});

export const profileRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/profile',
  component: Profile,
});

export const editEntryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/task/$taskId/edit',
  component: EditEntry,
});

interface CreateEntrySearch {
  date?: string;
}

export const createEntryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create',
  validateSearch: (search: Record<string, unknown>): CreateEntrySearch => {
    return {
      date: typeof search?.date === 'string' ? search.date : undefined,
    }
  },
  component: CreateEntry,
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
