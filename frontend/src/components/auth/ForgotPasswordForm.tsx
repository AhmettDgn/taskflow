'use client';

import { useState } from 'react';
import { getAuthRedirectOrigin } from '@/lib/utils';

const inputClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const labelClassName = 'text-sm font-medium leading-none';
const buttonClassName =
  'inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage('Gecerli bir e-posta adresi girin.');
      return;
    }

    setIsLoading(true);
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${getAuthRedirectOrigin()}/auth/callback?next=/profile`,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setSuccessMessage(`${normalizedEmail} adresine sifre sifirlama baglantisi gonderildi.`);
    setIsLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className={labelClassName}>E-posta</label>
        <input
          id="email"
          type="email"
          placeholder="siz@ornek.com"
          autoComplete="email"
          disabled={isLoading}
          className={inputClassName}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      {errorMessage && (
        <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </p>
      )}

      <button type="submit" className={buttonClassName} disabled={isLoading}>
        {isLoading ? 'Baglanti gonderiliyor...' : 'Sifirlama Baglantisi Gonder'}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        <a href="/login" className="font-medium text-primary hover:underline">
          Giris sayfasina don
        </a>
      </p>
    </form>
  );
}
