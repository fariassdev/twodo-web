import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseSearch = vi.fn();

// We need to mock both the router library (for useNavigate) and our own
// router definitions so that swapSuccessRoute.useSearch returns controllable
// data.
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../router', () => ({
  swapSuccessRoute: {
    useSearch: () => mockUseSearch(),
  },
}));

import SwapSuccess from './SwapSuccess';

function renderSwapSuccess(search: Record<string, string | undefined>) {
  mockUseSearch.mockReturnValue(search);
  return render(<SwapSuccess />);
}

describe('SwapSuccess', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseSearch.mockReset();
  });

  it('renders the provided task titles and a notification message when partner name exists', () => {
    renderSwapSuccess({ myTaskTitle: 'Wash dishes', partnerTaskTitle: 'Take out trash', partnerName: 'Ethel' });
    expect(screen.getAllByText('Wash dishes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Take out trash').length).toBeGreaterThan(0);
    expect(screen.getByText(/swap.success.partnerNotified/)).toBeInTheDocument();
  });

  it('navigates home when CTA is clicked', () => {
    renderSwapSuccess({ myTaskTitle: 'A', partnerTaskTitle: 'B' });
    screen.getByRole('button', { name: /swap.success.cta/ }).click();
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
  });
});
