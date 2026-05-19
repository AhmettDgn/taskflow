import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();
const createClientMock = vi.fn();
const loadDashboardPageDataMock = vi.fn();
const redirectError = new Error('NEXT_REDIRECT');

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    redirectMock(path);
    throw redirectError;
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

vi.mock('@/lib/dashboard', () => ({
  loadDashboardPageData: (...args: unknown[]) => loadDashboardPageDataMock(...args),
}));

import DashboardPage from '@/app/(dashboard)/dashboard/page';

describe('DashboardPage', () => {
  it('redirects to login when dashboard data returns a redirect', async () => {
    createClientMock.mockReturnValue({});
    loadDashboardPageDataMock.mockResolvedValue({ redirectTo: '/login' });

    await expect(DashboardPage()).rejects.toBe(redirectError);

    expect(redirectMock).toHaveBeenCalledWith('/login');
  });

  it('renders stats and quick links when a first team exists', async () => {
    createClientMock.mockReturnValue({});
    loadDashboardPageDataMock.mockResolvedValue({
      firstName: 'Ada',
      firstTeamId: 'team-1',
      taskStats: {
        total: 4,
        todo: 2,
        inProgress: 1,
        done: 1,
      },
      teams: [{ id: 'team-1', name: 'Core Team' }],
    });

    render(await DashboardPage());

    expect(screen.getByTestId('dashboard-heading')).toHaveTextContent('Merhaba, Ada');
    expect(screen.getByTestId('dashboard-stat-total')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-stat-todo')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-stat-in-progress')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-stat-done')).toBeInTheDocument();
    expect(screen.getByText('Gorevlerim')).toBeInTheDocument();
    expect(screen.getByText('Ekibe Katil')).toBeInTheDocument();
    expect(screen.getByText('Yeni Ekip Olustur')).toBeInTheDocument();
  });

  it('renders the empty-team state when the user has no teams', async () => {
    createClientMock.mockReturnValue({});
    loadDashboardPageDataMock.mockResolvedValue({
      firstName: 'Ada',
      firstTeamId: '',
      taskStats: {
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
      },
      teams: [],
    });

    render(await DashboardPage());

    expect(screen.getByText('Henuz ekibiniz yok.')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-stat-total')).not.toBeInTheDocument();
  });
});
