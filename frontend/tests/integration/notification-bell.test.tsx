import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const { useNotificationsMock, useRealtimeNotificationsMock } = vi.hoisted(() => ({
  useNotificationsMock: vi.fn(),
  useRealtimeNotificationsMock: vi.fn(),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: useNotificationsMock,
  useRealtimeNotifications: useRealtimeNotificationsMock,
}));

vi.mock('@/components/notifications/NotificationDropdown', () => ({
  NotificationDropdown: () => <div data-testid="notification-dropdown-content">dropdown</div>,
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useNotificationsMock.mockReset();
    useRealtimeNotificationsMock.mockReset();
    useNotificationsMock.mockReturnValue({ data: [] });
  });

  it('keeps notification fetching disabled on first render', () => {
    render(<NotificationBell />);

    expect(useNotificationsMock).toHaveBeenCalledWith({ enabled: false });
    expect(useRealtimeNotificationsMock).toHaveBeenCalledWith({ enabled: false });
  });

  it('enables notification fetching after idle time and when opened', async () => {
    render(<NotificationBell />);

    await act(async () => {
      vi.advanceTimersByTime(5);
    });

    expect(useNotificationsMock).toHaveBeenLastCalledWith({ enabled: true });

    fireEvent.click(screen.getByTestId('notification-bell-button'));

    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('notification-dropdown-content')).toBeInTheDocument();
  });
});
