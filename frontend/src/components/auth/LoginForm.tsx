'use client';

import { useState } from 'react';
import { redirectToPath } from '@/lib/browser-navigation';
import dynamic from 'next/dynamic';

const GoogleAuthButton = dynamic(
  () => import('@/components/auth/GoogleAuthButton').then(m => ({ default: m.GoogleAuthButton })),
  { ssr: false }
);

const inputClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const labelClassName = 'text-sm font-medium leading-none';
const buttonClassName =
  'inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50';

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage('Gecerli bir e-posta adresi girin.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Sifre en az 6 karakter olmalidir.');
      return;
    }

    setIsLoading(true);
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setErrorMessage(
        error.message === 'Invalid login credentials'
          ? 'E-posta veya sifre hatali.'
          : error.message
      );
      setIsLoading(false);
      return;
    }

    redirectToPath('/dashboard');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form" noValidate>
      <GoogleAuthButton mode="login" disabled={isLoading} />

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">veya</span>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className={labelClassName}>E-posta</label>
        <input
          id="email"
          type="email"
          placeholder="siz@ornek.com"
          autoComplete="email"
          disabled={isLoading}
          className={inputClassName}
          data-testid="login-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={labelClassName}>Sifre</label>
          <a href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
            Sifremi unuttum
          </a>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          disabled={isLoading}
          className={inputClassName}
          data-testid="login-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {errorMessage && (
        <p
          className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          data-testid="login-error"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        className={buttonClassName}
        disabled={isLoading}
        data-testid="login-submit"
      >
        {isLoading ? 'Giris yapiliyor...' : 'Giris Yap'}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Hesabiniz yok mu?{' '}
        <a href="/register" className="font-medium text-primary hover:underline">
          Hesap olusturun
        </a>
      </p>
    </form>
  );
}
