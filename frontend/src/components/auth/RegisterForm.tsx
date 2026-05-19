'use client';

import { useState } from 'react';
import { getAppOrigin } from '@/lib/utils';
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getEmailRedirectTo() {
  return `${getAppOrigin()}/auth/callback`;
}

export function RegisterForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim();

    if (normalizedName.length < 2) {
      setErrorMessage('Ad soyad en az 2 karakter olmalidir.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage('Gecerli bir e-posta adresi girin.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Sifre en az 8 karakter olmalidir.');
      return;
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMessage('Sifre en az bir buyuk harf ve bir rakam icermelidir.');
      return;
    }

    if (password != confirmPassword) {
      setErrorMessage('Sifreler eslesmiyor.');
      return;
    }

    setIsLoading(true);
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: normalizedName },
        emailRedirectTo: getEmailRedirectTo(),
      },
    });

    if (error) {
      setErrorMessage(
        error.message === 'User already registered'
          ? 'Bu e-posta adresiyle kayitli bir hesap var.'
          : error.message
      );
      setIsLoading(false);
      return;
    }

    setSuccessMessage('Hesabiniz olusturuldu. Onay baglantisi icin e-postanizi kontrol edin.');
    setIsLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <GoogleAuthButton mode="register" disabled={isLoading} />

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">veya</span>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="fullName" className={labelClassName}>Ad Soyad</label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          disabled={isLoading}
          className={inputClassName}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
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
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className={labelClassName}>Sifre</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          disabled={isLoading}
          className={inputClassName}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className={labelClassName}>Sifre Tekrar</label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          disabled={isLoading}
          className={inputClassName}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
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
        {isLoading ? 'Hesap olusturuluyor...' : 'Hesap Olustur'}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Zaten hesabiniz var mi?{' '}
        <a href="/login" className="font-medium text-primary hover:underline">
          Giris yapin
        </a>
      </p>
    </form>
  );
}
