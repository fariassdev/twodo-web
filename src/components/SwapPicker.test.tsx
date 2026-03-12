import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SwapDataset, Task } from '../lib/types';
import SwapPicker from './SwapPicker';

const mockNavigate = vi.fn();
const mockUseSwapDatasetQuery = vi.fn();
const mockUseSwapTasksMutation = vi.fn();
const mockUseAuthScope = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ taskId: 'origin-task' }),
}));

vi.mock('../lib/queryHooks', () => ({
  useSwapDatasetQuery: (...args: unknown[]) => mockUseSwapDatasetQuery(...args),
  useSwapTasksMutation: (...args: unknown[]) => mockUseSwapTasksMutation(...args),
  useAuthScope: (...args: unknown[]) => mockUseAuthScope(...args),
}));

vi.mock('./ui/TopBar', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('./ui/QueryErrorState', () => ({
  default: ({ onRetry }: { onRetry: () => void }) => (
    <button onClick={onRetry}>retry-error-state</button>
  ),
}));

const HOUSEHOLD_ID = 'household-1';
const MY_PROFILE_ID = 'profile-me';
const PARTNER_PROFILE_ID = 'profile-partner';
const TODAY = '2026-03-12';
const TOMORROW = '2026-03-13';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-default',
    title: 'Default task',
    description: null,
    type: 'task',
    priority: 'flexible',
    status: 'pending',
    date: TODAY,
    points: 10,
    is_recurring: false,
    frequency: null,
    recurrence_id: null,
    assignment_type: 'individual',
    assigned_to: MY_PROFILE_ID,
    last_done_by: null,
    location: null,
    start_time: null,
    end_time: null,
    household_id: HOUSEHOLD_ID,
    created_by: MY_PROFILE_ID,
    created_at: '2026-03-12T08:00:00.000Z',
    updated_at: '2026-03-12T08:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function makeDataset(overrides: Partial<SwapDataset> = {}): SwapDataset {
  return {
    originTask: makeTask({
      id: 'origin-task',
      title: 'Lavar platos',
      start_time: '18:00:00',
      end_time: '19:00:00',
    }),
    partnerTasks: [
      makeTask({
        id: 'perfect-match',
        title: 'Pasear al perro',
        assigned_to: PARTNER_PROFILE_ID,
        created_by: PARTNER_PROFILE_ID,
        points: 10,
        start_time: '09:00:00',
        end_time: '10:00:00',
      }),
      makeTask({
        id: 'alternative',
        title: 'Limpiar baño',
        assigned_to: PARTNER_PROFILE_ID,
        created_by: PARTNER_PROFILE_ID,
        points: 12,
        date: TOMORROW,
        start_time: '11:00:00',
        end_time: '12:00:00',
      }),
    ],
    myBusyTasks: [],
    partnerBusyTasks: [],
    partnerProfile: {
      id: PARTNER_PROFILE_ID,
      auth_user_id: null,
      name: 'Alex',
      avatar_url: null,
      bio: null,
      email: null,
      created_at: '2026-03-12T08:00:00.000Z',
    },
    ...overrides,
  };
}

function renderSwapPicker(dataset: SwapDataset) {
  mockUseAuthScope.mockReturnValue({
    householdId: HOUSEHOLD_ID,
    profileId: MY_PROFILE_ID,
  });
  mockUseSwapTasksMutation.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  });
  mockUseSwapDatasetQuery.mockReturnValue({
    data: dataset,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  });

  return render(<SwapPicker />);
}

describe('SwapPicker UI contracts', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseSwapDatasetQuery.mockReset();
    mockUseSwapTasksMutation.mockReset();
    mockUseAuthScope.mockReset();
  });

  it('renders a warning when the partner has an overlapping task with my origin task', () => {
    const dataset = makeDataset({
      partnerBusyTasks: [
        makeTask({
          id: 'partner-task-conflict',
          assigned_to: PARTNER_PROFILE_ID,
          created_by: PARTNER_PROFILE_ID,
          title: 'Poner la lavadora',
          start_time: '18:15:00',
          end_time: '19:15:00',
        }),
      ],
    });

    renderSwapPicker(dataset);

    expect(
      screen.getByText(/swap.partnerBusyWarning/i),
    ).toBeInTheDocument();
  });

  it('renders a warning when the partner has an overlapping event with my origin task', () => {
    const dataset = makeDataset({
      partnerBusyTasks: [
        makeTask({
          id: 'partner-event-conflict',
          type: 'event',
          assigned_to: PARTNER_PROFILE_ID,
          created_by: PARTNER_PROFILE_ID,
          title: 'Cena familiar',
          start_time: '18:30:00',
          end_time: '20:00:00',
        }),
      ],
    });

    renderSwapPicker(dataset);

    expect(
      screen.getByText(/swap.partnerBusyWarning/i),
    ).toBeInTheDocument();
  });

  it('does not render a warning when my origin task has no complete time range', () => {
    const dataset = makeDataset({
      originTask: makeTask({
        id: 'origin-without-end-time',
        title: 'Lavar platos',
        start_time: '18:00:00',
        end_time: null,
      }),
      partnerBusyTasks: [
        makeTask({
          id: 'partner-task-conflict',
          assigned_to: PARTNER_PROFILE_ID,
          created_by: PARTNER_PROFILE_ID,
          title: 'Poner la lavadora',
          start_time: '18:15:00',
          end_time: '19:15:00',
        }),
      ],
    });

    renderSwapPicker(dataset);

    expect(screen.queryByText(/mismo horario que tu tarea/i)).not.toBeInTheDocument();
  });

  it('never renders partner events as swap options even if they are present in the dataset', () => {
    const dataset = makeDataset({
      partnerTasks: [
        makeTask({
          id: 'valid-task',
          title: 'Pasear al perro',
          assigned_to: PARTNER_PROFILE_ID,
          created_by: PARTNER_PROFILE_ID,
          points: 10,
          start_time: '09:00:00',
          end_time: '10:00:00',
        }),
        makeTask({
          id: 'event-should-not-render',
          title: 'Ir al cine',
          type: 'event',
          assigned_to: PARTNER_PROFILE_ID,
          created_by: PARTNER_PROFILE_ID,
          start_time: '20:00:00',
          end_time: '22:00:00',
        }),
      ],
    });

    renderSwapPicker(dataset);

    expect(screen.getByText('Pasear al perro')).toBeInTheDocument();
    expect(screen.queryByText('Ir al cine')).not.toBeInTheDocument();
  });

  it('never renders a candidate that overlaps with one of my tasks', () => {
    const dataset = makeDataset({
      partnerTasks: [
        makeTask({
          id: 'overlaps-with-my-task',
          title: 'Hacer compra',
          assigned_to: PARTNER_PROFILE_ID,
          created_by: PARTNER_PROFILE_ID,
          start_time: '10:00:00',
          end_time: '11:00:00',
        }),
        makeTask({
          id: 'valid-task',
          title: 'Pasear al perro',
          assigned_to: PARTNER_PROFILE_ID,
          created_by: PARTNER_PROFILE_ID,
          start_time: '12:00:00',
          end_time: '13:00:00',
        }),
      ],
      myBusyTasks: [
        makeTask({
          id: 'my-task-conflict',
          title: 'Mi tarea ocupada',
          start_time: '10:15:00',
          end_time: '10:45:00',
        }),
      ],
    });

    renderSwapPicker(dataset);

    expect(screen.getByText('Pasear al perro')).toBeInTheDocument();
    expect(screen.queryByText('Hacer compra')).not.toBeInTheDocument();
  });

  it('never renders a candidate that overlaps with one of my events', () => {
    const dataset = makeDataset({
      partnerTasks: [
        makeTask({
          id: 'overlaps-with-my-event',
          title: 'Limpiar el baño',
          assigned_to: PARTNER_PROFILE_ID,
          created_by: PARTNER_PROFILE_ID,
          start_time: '15:00:00',
          end_time: '16:00:00',
        }),
        makeTask({
          id: 'valid-task',
          title: 'Pasear al perro',
          assigned_to: PARTNER_PROFILE_ID,
          created_by: PARTNER_PROFILE_ID,
          start_time: '16:30:00',
          end_time: '17:00:00',
        }),
      ],
      myBusyTasks: [
        makeTask({
          id: 'my-event-conflict',
          type: 'event',
          title: 'Cita médica',
          start_time: '15:15:00',
          end_time: '15:45:00',
        }),
      ],
    });

    renderSwapPicker(dataset);

    expect(screen.getByText('Pasear al perro')).toBeInTheDocument();
    expect(screen.queryByText('Limpiar el baño')).not.toBeInTheDocument();
  });

  it('renders the empty state when only partner events or overlapping entries exist', () => {
    const dataset = makeDataset({
      partnerTasks: [
        makeTask({
          id: 'event-only',
          title: 'Cena con amigos',
          type: 'event',
          assigned_to: PARTNER_PROFILE_ID,
          created_by: PARTNER_PROFILE_ID,
          start_time: '20:00:00',
          end_time: '22:00:00',
        }),
        makeTask({
          id: 'task-only-overlap',
          title: 'Poner la lavadora',
          assigned_to: PARTNER_PROFILE_ID,
          created_by: PARTNER_PROFILE_ID,
          start_time: '09:00:00',
          end_time: '10:00:00',
        }),
      ],
      myBusyTasks: [
        makeTask({
          id: 'my-overlap',
          title: 'Bloqueo agenda',
          start_time: '09:15:00',
          end_time: '09:45:00',
        }),
      ],
    });

    renderSwapPicker(dataset);

    expect(screen.getByText(/swap.noOptions/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /swap.confirmSwap/i })).not.toBeInTheDocument();
  });
});