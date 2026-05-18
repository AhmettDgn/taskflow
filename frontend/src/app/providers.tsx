'use client';

import { Fragment, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { STALE_TIME } from '@/lib/constants';

type ProvidersProps = {
  children: React.ReactNode;
  withQueryClient?: boolean;
  withToaster?: boolean;
};

export function Providers({
  children,
  withQueryClient = true,
  withToaster = true,
}: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_TIME,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      })
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      if (registrations.length === 0) return;

      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }

      window.location.reload();
    });
  }, []);

  const content = (
    <Fragment>
      {children}
      {mounted && withToaster ? <Toaster richColors position="top-right" /> : null}
    </Fragment>
  );

  if (!withQueryClient) {
    return content;
  }

  return <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>;
}
