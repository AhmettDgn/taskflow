'use client';

import { useEffect, useId } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getAuthContext } from '@/lib/supabase/auth-helpers';
import { QUERY_KEYS, STALE_TIME } from '@/lib/constants';
import type { Notification } from '@/lib/types';

interface NotificationsOptions {
  enabled?: boolean;
}

function mergeNotification(old: Notification[] | undefined, incoming: Notification) {
  if (!old) return [incoming];
  if (old.some((notification) => notification.id === incoming.id)) return old;
  return [incoming, ...old];
}

export function useNotifications(options: NotificationsOptions = {}) {
  const { enabled = true } = options;

  return useQuery<Notification[]>({
    queryKey: [QUERY_KEYS.notifications],
    queryFn: async () => {
      const { supabase, userId } = await getAuthContext();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return notificationId;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Notification[]>([QUERY_KEYS.notifications], (old) =>
        old?.map((n) => (n.id === id ? { ...n, is_read: true } : n)) ?? []
      );
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { supabase, userId } = await getAuthContext();
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>([QUERY_KEYS.notifications], (old) =>
        old?.map((n) => ({ ...n, is_read: true })) ?? []
      );
    },
  });
}

export function useRealtimeNotifications(options: NotificationsOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const subscriptionId = useId();

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let isActive = true;
    let channelCleanup: (() => void) | undefined;

    // getSession lokaldir; getUser() burada her bell mount'unda Supabase Auth'a
    // ~500ms'lik gereksiz bir network turu ekliyordu. Kanal filtresi kimliğe değil
    // kullanıcı id'sine ihtiyaç duyar; asıl güvenlik realtime RLS'te.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (!isActive || !user) return;

      const channel = supabase
        .channel(`notifications:user:${user.id}:${subscriptionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const notification = payload.new as Notification;
            queryClient.setQueryData<Notification[]>([QUERY_KEYS.notifications], (old) =>
              mergeNotification(old, notification)
            );
          }
        )
        .subscribe();

      channelCleanup = () => {
        void supabase.removeChannel(channel);
      };
    });

    return () => {
      isActive = false;
      channelCleanup?.();
    };
  }, [enabled, queryClient, subscriptionId]);
}
