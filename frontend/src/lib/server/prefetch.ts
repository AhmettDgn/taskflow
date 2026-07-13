import { QueryClient, dehydrate } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/constants';

// İstek başına yeni QueryClient — asla module scope'ta tutma (istekler arası sızıntı).
// staleTime client'takiyle aynı: hydrate edilen veri 30sn boyunca taze sayılır,
// mount'ta tekrar fetch edilmez.
export function createServerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME,
      },
    },
  });
}

export { dehydrate };
