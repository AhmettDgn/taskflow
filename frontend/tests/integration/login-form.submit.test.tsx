import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/components/auth/LoginForm';

const { mockSignInWithPassword, redirectToPathMock } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  redirectToPathMock: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

vi.mock('@/lib/browser-navigation', () => ({
  redirectToPath: redirectToPathMock,
}));

describe('LoginForm submit flow', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset();
    redirectToPathMock.mockReset();
  });

  it('submits normalized credentials and redirects on success', async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockResolvedValue({ error: null });
    render(<LoginForm />);

    await user.type(screen.getByTestId('login-email'), ' user@example.com ');
    await user.type(screen.getByTestId('login-password'), '123456');
    await user.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: '123456',
      });
    });

    expect(redirectToPathMock).toHaveBeenCalledWith('/dashboard');
  });

  it('shows a friendly error when credentials are invalid', async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    render(<LoginForm />);

    await user.type(screen.getByTestId('login-email'), 'user@example.com');
    await user.type(screen.getByTestId('login-password'), '123456');
    await user.click(screen.getByTestId('login-submit'));

    expect(await screen.findByTestId('login-error')).toHaveTextContent('E-posta veya sifre hatali.');
    expect(redirectToPathMock).not.toHaveBeenCalled();
  });
});
