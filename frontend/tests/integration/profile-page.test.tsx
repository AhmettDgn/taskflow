import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from '@/app/(dashboard)/profile/page';

const {
  useAuthMock,
  useProfileMock,
  mutateAsyncMock,
  telegramLinkMock,
  telegramUnlinkMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useProfileMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  telegramLinkMock: vi.fn(),
  telegramUnlinkMock: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: useAuthMock,
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: useProfileMock,
  useUpdateProfile: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useTelegram', () => ({
  useTelegramLink: () => ({ mutateAsync: telegramLinkMock, isPending: false }),
  useTelegramUnlink: () => ({ mutateAsync: telegramUnlinkMock, isPending: false }),
  useTelegramConfig: () => ({ data: { isAdmin: false }, isLoading: false }),
  useSaveTelegramConfig: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('ProfilePage Telegram settings', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'ada@example.com',
        user_metadata: { full_name: 'Ada Lovelace' },
        app_metadata: { provider: 'email' },
        identities: [{ provider: 'email' }],
      },
    });

    useProfileMock.mockReturnValue({
      data: {
        id: 'user-1',
        email: 'ada@example.com',
        full_name: 'Ada Lovelace',
        avatar_url: null,
        telegram_chat_id: '12345',
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      full_name: 'Ada Lovelace',
      avatar_url: null,
      telegram_chat_id: '67890',
    });

    telegramLinkMock.mockReset();
    telegramUnlinkMock.mockReset();
  });

  it('submits trimmed Telegram chat ID updates from the advanced editor', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    // Manual entry lives behind the "advanced" collapsible now.
    await user.click(screen.getByRole('button', { name: /Gelismis/i }));
    await user.click(screen.getAllByRole('button', { name: 'Duzenle' })[1]);
    const telegramInput = screen.getByTestId('profile-telegram-chat-id');

    await user.clear(telegramInput);
    await user.type(telegramInput, ' 67890 ');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(mutateAsyncMock).toHaveBeenCalledWith({ telegramChatId: '67890' });
  });

  it('opens a deep link when an unlinked user clicks Connect', async () => {
    useProfileMock.mockReturnValue({
      data: {
        id: 'user-1',
        email: 'ada@example.com',
        full_name: 'Ada Lovelace',
        avatar_url: null,
        telegram_chat_id: null,
      },
      isLoading: false,
      refetch: vi.fn(),
    });
    telegramLinkMock.mockResolvedValue({
      deepLink: 'https://t.me/TaskFlowBot?start=tok123',
      botUsername: 'TaskFlowBot',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);

    const user = userEvent.setup();
    render(<ProfilePage />);

    await user.click(screen.getByTestId('telegram-connect'));

    expect(telegramLinkMock).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(
      'https://t.me/TaskFlowBot?start=tok123',
      '_blank',
      'noopener,noreferrer'
    );

    vi.unstubAllGlobals();
  });
});
