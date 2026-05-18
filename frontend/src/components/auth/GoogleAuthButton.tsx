'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getAppOrigin } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

function getRedirectTo() {
  return `${getAppOrigin()}/auth/callback?next=/dashboard`;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mr-2 h-4 w-4">
      <path
        d="M21.805 10.023h-9.72v3.955h5.57c-.24 1.273-.959 2.352-2.038 3.071v2.55h3.301c1.932-1.779 3.047-4.401 3.047-7.517 0-.683-.06-1.367-.16-2.059Z"
        fill="#4285F4"
      />
      <path
        d="M12.085 22c2.769 0 5.1-.915 6.833-2.47l-3.301-2.55c-.915.612-2.09.99-3.532.99-2.708 0-5.004-1.826-5.825-4.295H2.85v2.63A10.313 10.313 0 0 0 12.085 22Z"
        fill="#34A853"
      />
      <path
        d="M6.26 13.675a6.19 6.19 0 0 1-.326-1.955c0-.679.117-1.334.326-1.955V7.135H2.85a10.286 10.286 0 0 0 0 9.17l3.41-2.63Z"
        fill="#FBBC05"
      />
      <path
        d="M12.085 5.47c1.512 0 2.865.52 3.934 1.543l2.95-2.95C17.18 2.39 14.849 1.5 12.085 1.5A10.313 10.313 0 0 0 2.85 7.135l3.41 2.63c.82-2.47 3.117-4.295 5.825-4.295Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mr-2 h-4 w-4 animate-spin">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export function GoogleAuthButton({
  mode,
  disabled,
}: {
  mode: 'login' | 'register';
  disabled?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectTo(),
      },
    });

    if (error) {
      toast.error(error.message ?? 'Google ile devam edilemedi');
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      onClick={handleGoogleAuth}
      disabled={disabled || isLoading}
    >
      {isLoading ? <SpinnerIcon /> : <GoogleIcon />}
      {mode === 'login' ? 'Google ile Giris Yap' : 'Google ile Kayit Ol'}
    </button>
  );
}
