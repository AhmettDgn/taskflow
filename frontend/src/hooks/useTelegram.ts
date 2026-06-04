'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiPath } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/constants';
import type { Profile, TelegramConfigStatus, TelegramLinkResponse } from '@/lib/types';

async function readJson<T>(response: Response, fallbackError: string): Promise<T> {
  const json = await response.json();
  if (!response.ok) {
    throw new Error((json as { error?: string }).error ?? fallbackError);
  }
  return json as T;
}

/** Generates a single-use deep-link to connect the current user's Telegram. */
export function useTelegramLink() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(getApiPath('/telegram/link'), {
        method: 'POST',
        credentials: 'include',
      });
      return readJson<TelegramLinkResponse>(response, 'Baglanti olusturulamadi');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Baglanti olusturulamadi');
    },
  });
}

/** Removes the Telegram link from the current user's profile. */
export function useTelegramUnlink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(getApiPath('/telegram/link'), {
        method: 'DELETE',
        credentials: 'include',
      });
      return readJson<{ ok: boolean }>(response, 'Baglanti kaldirilamadi');
    },
    onSuccess: () => {
      queryClient.setQueryData<Profile | undefined>([QUERY_KEYS.profile], (prev) =>
        prev ? { ...prev, telegram_chat_id: null } : prev
      );
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.profile] });
      toast.success('Telegram baglantisi kaldirildi');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Baglanti kaldirilamadi');
    },
  });
}

/** Reads the shared-bot configuration status (admin setup card). */
export function useTelegramConfig() {
  return useQuery<TelegramConfigStatus>({
    queryKey: [QUERY_KEYS.telegramConfig],
    queryFn: async () => {
      const response = await fetch(getApiPath('/telegram/config'), {
        credentials: 'include',
      });
      return readJson<TelegramConfigStatus>(response, 'Bot durumu yuklenemedi');
    },
  });
}

/** Saves a bot token and registers the webhook (admin only). */
export function useSaveTelegramConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (botToken: string) => {
      const response = await fetch(getApiPath('/telegram/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ botToken }),
      });
      return readJson<TelegramConfigStatus>(response, 'Bot kaydedilemedi');
    },
    onSuccess: (status) => {
      queryClient.setQueryData([QUERY_KEYS.telegramConfig], status);
      toast.success('Telegram botu baglandi ve webhook kuruldu');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Bot kaydedilemedi');
    },
  });
}
