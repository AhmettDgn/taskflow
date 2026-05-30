import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from '@/app/(dashboard)/profile/page';

const { useAuthMock, useProfileMock, mutateAsyncMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useProfileMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
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
    });

    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      full_name: 'Ada Lovelace',
      avatar_url: null,
      telegram_chat_id: '67890',
    });
  });

  it('submits trimmed Telegram chat ID updates', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await user.click(screen.getAllByRole('button', { name: 'Duzenle' })[1]);
    const telegramInput = screen.getByTestId('profile-telegram-chat-id');

    await user.clear(telegramInput);
    await user.type(telegramInput, ' 67890 ');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(mutateAsyncMock).toHaveBeenCalledWith({ telegramChatId: '67890' });
  });
});
