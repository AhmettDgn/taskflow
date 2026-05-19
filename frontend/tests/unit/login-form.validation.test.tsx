import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { isValidEmail, LoginForm } from '@/components/auth/LoginForm';

describe('LoginForm validation', () => {
  it('validates email format helper', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
  });

  it('shows an error for invalid email addresses', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByTestId('login-email'), 'invalid-email');
    await user.type(screen.getByTestId('login-password'), '123456');
    await user.click(screen.getByTestId('login-submit'));

    expect(screen.getByTestId('login-error')).toHaveTextContent('Gecerli bir e-posta adresi girin.');
  });

  it('shows an error for short passwords', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByTestId('login-email'), 'user@example.com');
    await user.type(screen.getByTestId('login-password'), '123');
    await user.click(screen.getByTestId('login-submit'));

    expect(screen.getByTestId('login-error')).toHaveTextContent('Sifre en az 6 karakter olmalidir.');
  });
});
