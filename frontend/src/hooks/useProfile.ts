'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getApiPath } from '@/lib/api';
import { QUERY_KEYS, STALE_TIME } from '@/lib/constants';
import type { Profile } from '@/lib/types';

interface UpdateProfileValues {
  fullName?: string;
  telegramChatId?: string | null;
}

export function useProfile() {
  return useQuery<Profile>({
    queryKey: [QUERY_KEYS.profile],
    queryFn: async () => {
      const response = await fetch(getApiPath('/profile'), {
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? 'Profil yuklenemedi');
      }

      return json.profile as Profile;
    },
    staleTime: STALE_TIME,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fullName, telegramChatId }: UpdateProfileValues) => {
      const response = await fetch(getApiPath('/profile'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...(fullName !== undefined && { fullName }),
          ...(telegramChatId !== undefined && { telegramChatId }),
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? 'Profil guncellenemedi');
      }

      if (fullName !== undefined) {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
          data: { full_name: fullName },
        });

        if (error) {
          throw error;
        }
      }

      return json.profile as Profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData([QUERY_KEYS.profile], profile);
      toast.success('Profil guncellendi');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Profil guncellenemedi');
    },
  });
}
