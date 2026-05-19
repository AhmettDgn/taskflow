'use client';

import { Fragment, useState } from 'react';
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

  const content = (
    <Fragment>
      {children}
      {withToaster ? <Toaster richColors position="top-right" /> : null}
    </Fragment>
  );

  if (!withQueryClient) {
    return content;
  }

  return <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>;
}
